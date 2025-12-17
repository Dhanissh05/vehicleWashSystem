import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  sendVehicleReceivedSms,
  sendVehicleReadySms,
  sendWorkerCredentialsSms,
  sendOtpSms,
} from '../services/sms.service';
import {
  sendVehicleReadyNotification,
  sendVehicleReceivedNotification,
} from '../services/fcm.service';

// Enum-like constants since SQLite doesn't support enums
const UserRole = {
  ADMIN: 'ADMIN',
  WORKER: 'WORKER',
  CUSTOMER: 'CUSTOMER',
};

const VehicleStatus = {
  REGISTERED: 'REGISTERED',
  RECEIVED: 'RECEIVED',
  WASHING: 'WASHING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  DELIVERED: 'DELIVERED',
  BODY_REPAIR_ASSESSMENT: 'BODY_REPAIR_ASSESSMENT',
  BODY_REPAIR_IN_PROGRESS: 'BODY_REPAIR_IN_PROGRESS',
  BODY_REPAIR_PAINTING: 'BODY_REPAIR_PAINTING',
  BODY_REPAIR_COMPLETE: 'BODY_REPAIR_COMPLETE',
};

const ServiceType = {
  WASH: 'WASH',
  BODY_REPAIR: 'BODY_REPAIR',
};

const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  MANUAL_PENDING: 'MANUAL_PENDING',
  REJECTED: 'REJECTED',
  REFUNDED: 'REFUNDED',
};

const prisma = new PrismaClient();

interface Context {
  user?: {
    id: string;
    mobile: string;
    role: string;
  };
  prisma: PrismaClient;
}

// Helper to check authentication
const requireAuth = (context: Context) => {
  if (!context.user) {
    throw new Error('Not authenticated');
  }
  return context.user;
};

// Helper to check admin role
const requireAdmin = (context: Context) => {
  const user = requireAuth(context);
  if (user.role !== UserRole.ADMIN) {
    throw new Error('Admin access required');
  }
  return user;
};

// Helper to check admin or worker role
const requireStaff = (context: Context) => {
  const user = requireAuth(context);
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.WORKER) {
    throw new Error('Staff access required');
  }
  return user;
};

export const resolvers = {
  Query: {
    // Get current user
    me: async (_: any, __: any, context: Context) => {
      const user = requireAuth(context);
      return await context.prisma.user.findUnique({
        where: { id: user.id },
      });
    },

    // Check if user exists by mobile number
    checkUserExists: async (_: any, { mobile }: { mobile: string }, context: Context) => {
      const user = await context.prisma.user.findUnique({
        where: { mobile },
      });
      return !!user;
    },

    // Get vehicles with filters
    vehicles: async (
      _: any,
      { status, vehicleType, limit = 50, offset = 0 }: any,
      context: Context
    ) => {
      requireStaff(context);
      
      return await context.prisma.vehicle.findMany({
        where: {
          ...(status && { status }),
          ...(vehicleType && { vehicleType }),
        },
        include: {
          customer: true,
          worker: true,
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
    },

    // Get vehicle by ID
    vehicleById: async (_: any, { id }: any, context: Context) => {
      requireAuth(context);
      
      return await context.prisma.vehicle.findUnique({
        where: { id },
        include: {
          customer: true,
          worker: true,
          payment: true,
          center: true,
        },
      });
    },

    // Get vehicle by number
    vehicleByNumber: async (_: any, { vehicleNumber }: any, context: Context) => {
      requireStaff(context);
      
      return await context.prisma.vehicle.findFirst({
        where: { 
          vehicleNumber: vehicleNumber.toUpperCase(),
        },
        include: {
          customer: true,
          worker: true,
          payment: true,
          center: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    },

    // Get customer's vehicles
    myVehicles: async (_: any, __: any, context: Context) => {
      const user = requireAuth(context);
      
      return await context.prisma.vehicle.findMany({
        where: { customerId: user.id },
        include: {
          worker: true,
          payment: true,
          center: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    },

    // Get worker's assigned vehicles
    assignedVehicles: async (_: any, __: any, context: Context) => {
      const user = requireAuth(context);
      
      return await context.prisma.vehicle.findMany({
        where: { workerId: user.id },
        include: {
          customer: true,
          payment: true,
          center: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    },

    // Get vehicle statistics
    vehicleStats: async (_: any, __: any, context: Context) => {
      requireStaff(context);
      
      const [received, washing, readyForPickup, delivered] = await Promise.all([
        context.prisma.vehicle.count({ where: { status: VehicleStatus.RECEIVED } }),
        context.prisma.vehicle.count({ where: { status: VehicleStatus.WASHING } }),
        context.prisma.vehicle.count({ where: { status: VehicleStatus.READY_FOR_PICKUP } }),
        context.prisma.vehicle.count({ where: { status: VehicleStatus.DELIVERED } }),
      ]);

      return { received, washing, readyForPickup, delivered };
    },

    // Dashboard metrics
    dashboardMetrics: async (_: any, { startDate, endDate }: any, context: Context) => {
      requireStaff(context);
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const dateFilter = {
        ...(startDate && endDate
          ? { receivedAt: { gte: new Date(startDate), lte: new Date(endDate) } }
          : { receivedAt: { gte: today } }),
      };

      const [
        totalWashesToday,
        totalWashesInRange,
        carWashesCount,
        twoWheelerWashesCount,
        paymentsData,
        activeWorkers,
        pendingManualPayments,
        recentVehicles,
      ] = await Promise.all([
        context.prisma.vehicle.count({ where: { receivedAt: { gte: today } } }),
        context.prisma.vehicle.count({ where: dateFilter }),
        context.prisma.vehicle.count({
          where: { ...dateFilter, vehicleType: 'CAR' },
        }),
        context.prisma.vehicle.count({
          where: { ...dateFilter, vehicleType: 'TWO_WHEELER' },
        }),
        context.prisma.payment.aggregate({
          where: { status: PaymentStatus.PAID },
          _sum: { amount: true },
        }),
        context.prisma.user.count({ where: { role: UserRole.WORKER, isActive: true } }),
        context.prisma.payment.count({ where: { status: PaymentStatus.MANUAL_PENDING } }),
        context.prisma.vehicle.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { customer: true, worker: true, payment: true },
        }),
      ]);

      return {
        totalWashesToday,
        totalWashesInRange,
        carWashesCount,
        twoWheelerWashesCount,
        totalPaymentsReceived: paymentsData._sum.amount || 0,
        activeWorkers,
        pendingManualPayments,
        recentVehicles,
      };
    },

    // Get pricing
    pricing: async (_: any, __: any, context: Context) => {
      return await context.prisma.pricing.findMany({
        where: { isActive: true },
        orderBy: { vehicleType: 'asc' },
      });
    },

    // Get pricing by type
    pricingByType: async (_: any, { vehicleType, carCategory }: any, context: Context) => {
      return await context.prisma.pricing.findFirst({
        where: {
          vehicleType,
          carCategory,
          isActive: true,
        },
      });
    },

    // Get workers
    workers: async (_: any, __: any, context: Context) => {
      requireAdmin(context);
      
      return await context.prisma.user.findMany({
        where: { role: UserRole.WORKER },
        orderBy: { createdAt: 'desc' },
      });
    },

    // Get customers
    customers: async (_: any, { limit = 50, offset = 0 }: any, context: Context) => {
      requireAdmin(context);
      
      return await context.prisma.user.findMany({
        where: { role: UserRole.CUSTOMER },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
    },

    // Get user by ID
    userById: async (_: any, { id }: any, context: Context) => {
      requireAdmin(context);
      
      return await context.prisma.user.findUnique({
        where: { id },
      });
    },

    // Get payments
    payments: async (_: any, { status, limit = 50, offset = 0 }: any, context: Context) => {
      requireStaff(context);
      
      return await context.prisma.payment.findMany({
        where: { ...(status && { status }) },
        include: {
          vehicle: true,
          customer: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
    },

    // Get manual pending payments
    manualPendingPayments: async (_: any, __: any, context: Context) => {
      requireStaff(context);
      
      return await context.prisma.payment.findMany({
        where: { status: PaymentStatus.MANUAL_PENDING },
        include: {
          vehicle: true,
          customer: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    },

    // Get centers
    centers: async (_: any, __: any, context: Context) => {
      return await context.prisma.center.findMany({
        where: { isActive: true },
      });
    },
  },

  Mutation: {
    // Send OTP
    sendOtp: async (_: any, { mobile }: any, context: Context) => {
      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await context.prisma.otpCode.create({
        data: {
          mobile,
          code,
          expiresAt,
        },
      });

      // Send OTP via SMS
      await sendOtpSms(mobile, code);
      console.log(`📱 OTP for ${mobile}: ${code}`);
      
      return true;
    },

    // Verify OTP and login/register
    verifyOtp: async (_: any, { mobile, code }: any, context: Context) => {
      const otpRecord = await context.prisma.otpCode.findFirst({
        where: {
          mobile,
          code,
          verified: false,
          expiresAt: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!otpRecord) {
        throw new Error('Invalid or expired OTP');
      }

      // Mark OTP as verified
      await context.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { verified: true },
      });

      // Find or create user
      let user = await context.prisma.user.findUnique({
        where: { mobile },
      });

      if (!user) {
        user = await context.prisma.user.create({
          data: {
            mobile,
            role: UserRole.CUSTOMER,
          },
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, mobile: user.mobile, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string }
      );

      return { token, user };
    },

    // Login with password (for admin/worker)
    login: async (_: any, { mobile, password }: any, context: Context) => {
      const user = await context.prisma.user.findUnique({
        where: { mobile },
      });

      if (!user || !user.password) {
        throw new Error('Invalid credentials');
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw new Error('Invalid credentials');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      const token = jwt.sign(
        { id: user.id, mobile: user.mobile, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string }
      );

      return { token, user };
    },

    // Update password for existing user
    updatePassword: async (_: any, { mobile, password }: any, context: Context) => {
      const user = await context.prisma.user.findUnique({
        where: { mobile },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user with hashed password
      const updatedUser = await context.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      return updatedUser;
    },

    // Signup (for new customers with password)
    signup: async (_: any, { input }: any, context: Context) => {
      // Check if user already exists
      const existingUser = await context.prisma.user.findUnique({
        where: { mobile: input.mobile },
      });

      if (existingUser) {
        throw new Error('User already exists with this mobile number');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Create new customer user
      const user = await context.prisma.user.create({
        data: {
          mobile: input.mobile,
          name: input.name,
          email: input.email,
          password: hashedPassword,
          role: UserRole.CUSTOMER,
        },
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, mobile: user.mobile, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string }
      );

      return { token, user };
    },

    // Setup biometric authentication
    setupBiometric: async (_: any, { input }: any, context: Context) => {
      const user = requireAuth(context);

      return await context.prisma.user.update({
        where: { id: user.id },
        data: {
          biometricEnabled: input.enabled,
          biometricPublicKey: input.publicKey,
        },
      });
    },

    // Update location
    updateLocation: async (_: any, { location }: any, context: Context) => {
      const user = requireAuth(context);
      
      return await context.prisma.user.update({
        where: { id: user.id },
        data: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      });
    },

    // Update FCM token
    updateFcmToken: async (_: any, { token }: any, context: Context) => {
      const user = requireAuth(context);
      
      return await context.prisma.user.update({
        where: { id: user.id },
        data: { fcmToken: token },
      });
    },

    // Change password (authenticated users)
    changePassword: async (_: any, { input }: any, context: Context) => {
      const user = requireAuth(context);

      const fullUser = await context.prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!fullUser || !fullUser.password) {
        throw new Error('Password not set for this account');
      }

      // Verify current password
      const isValid = await bcrypt.compare(input.currentPassword, fullUser.password);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      if (input.newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      // Update password
      const updatedUser = await context.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      return updatedUser;
    },

    // Send OTP for profile update (email or mobile)
    sendProfileOtp: async (_: any, { type, value }: any, context: Context) => {
      const user = requireAuth(context);

      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await context.prisma.profileOtp.create({
        data: {
          type,
          value,
          code,
          expiresAt,
          userId: user.id,
        },
      });

      if (type === 'EMAIL') {
        // TODO: Send email OTP (integrate with email service)
        console.log(`📧 Email OTP for ${value}: ${code}`);
        return { 
          success: true, 
          message: `OTP sent to ${value}. Check console for now.` 
        };
      } else if (type === 'MOBILE') {
        // Send SMS OTP
        await sendOtpSms(value, code);
        console.log(`📱 Mobile OTP for ${value}: ${code}`);
        return { 
          success: true, 
          message: `OTP sent to ${value}` 
        };
      }

      throw new Error('Invalid OTP type');
    },

    // Verify OTP for profile update
    verifyProfileOtp: async (_: any, { type, value, code }: any, context: Context) => {
      const user = requireAuth(context);

      const otpRecord = await context.prisma.profileOtp.findFirst({
        where: {
          type,
          value,
          code,
          userId: user.id,
          verified: false,
          expiresAt: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!otpRecord) {
        throw new Error('Invalid or expired OTP');
      }

      // Mark OTP as verified
      await context.prisma.profileOtp.update({
        where: { id: otpRecord.id },
        data: { verified: true },
      });

      return true;
    },

    // Update user profile
    updateProfile: async (_: any, { input }: any, context: Context) => {
      const user = requireAuth(context);
      const updateData: any = {};

      // Always allow name update without OTP
      if (input.name !== undefined) {
        updateData.name = input.name;
      }

      // Allow photo URL update
      if (input.photoUrl !== undefined) {
        updateData.photoUrl = input.photoUrl;
      }

      // For email update, verify OTP
      if (input.email !== undefined) {
        if (!input.emailOtp) {
          throw new Error('Email OTP is required to update email');
        }

        // Verify email OTP
        const emailOtpRecord = await context.prisma.profileOtp.findFirst({
          where: {
            type: 'EMAIL',
            value: input.email,
            code: input.emailOtp,
            userId: user.id,
            verified: true,
            expiresAt: { gte: new Date() },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!emailOtpRecord) {
          throw new Error('Invalid or expired email OTP');
        }

        // Check if email is already used by another user
        const existingUser = await context.prisma.user.findFirst({
          where: {
            email: input.email,
            NOT: { id: user.id },
          },
        });

        if (existingUser) {
          throw new Error('Email is already in use by another account');
        }

        updateData.email = input.email;
      }

      // For mobile update, verify OTP
      if (input.mobile !== undefined) {
        if (!input.mobileOtp) {
          throw new Error('Mobile OTP is required to update mobile number');
        }

        // Verify mobile OTP
        const mobileOtpRecord = await context.prisma.profileOtp.findFirst({
          where: {
            type: 'MOBILE',
            value: input.mobile,
            code: input.mobileOtp,
            userId: user.id,
            verified: true,
            expiresAt: { gte: new Date() },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!mobileOtpRecord) {
          throw new Error('Invalid or expired mobile OTP');
        }

        // Check if mobile is already used by another user
        const existingUser = await context.prisma.user.findFirst({
          where: {
            mobile: input.mobile,
            NOT: { id: user.id },
          },
        });

        if (existingUser) {
          throw new Error('Mobile number is already in use by another account');
        }

        updateData.mobile = input.mobile;
      }

      // Update user
      return await context.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    },

    // Add vehicle
    addVehicle: async (_: any, { input }: any, context: Context) => {
      requireAuth(context);
      
      const isStaff = context.user!.role === UserRole.ADMIN || context.user!.role === UserRole.WORKER;
      
      // Check if vehicle already exists with active status
      const existingVehicle = await context.prisma.vehicle.findFirst({
        where: { 
          vehicleNumber: input.vehicleNumber,
          status: {
            not: VehicleStatus.DELIVERED
          }
        },
      });

      console.log(`🔍 Checking vehicle ${input.vehicleNumber}:`, {
        found: !!existingVehicle,
        status: existingVehicle?.status,
        isStaff,
      });

      if (existingVehicle) {
        // If vehicle is REGISTERED and staff is trying to receive it, update the existing vehicle instead
        if (existingVehicle.status === VehicleStatus.REGISTERED && isStaff) {
          // Check if slots are available based on vehicle type
          const center = await context.prisma.center.findUnique({
            where: { id: input.centerId },
          });
          
          if (!center) {
            throw new Error('Wash center not found');
          }
          
          const isTwoWheeler = input.vehicleType === 'TWO_WHEELER';
          const availableSlots = isTwoWheeler 
            ? center.availableSlotsTwoWheeler 
            : center.availableSlotsCar;
          
          if (availableSlots <= 0) {
            const vehicleTypeName = isTwoWheeler ? 'two-wheeler' : 'car';
            throw new Error(`No ${vehicleTypeName} slots available for today. All slots are full.`);
          }
          
          // Decrement available slots for the specific vehicle type
          await context.prisma.center.update({
            where: { id: input.centerId },
            data: isTwoWheeler 
              ? { availableSlotsTwoWheeler: { decrement: 1 } }
              : { availableSlotsCar: { decrement: 1 } },
          });

          // Update the existing REGISTERED vehicle to RECEIVED
          const updatedVehicle = await context.prisma.vehicle.update({
            where: { id: existingVehicle.id },
            data: {
              status: VehicleStatus.RECEIVED,
              receivedAt: new Date(),
              centerId: input.centerId,
              brand: input.brand || existingVehicle.brand,
              model: input.model || existingVehicle.model,
              color: input.color || existingVehicle.color,
              notes: input.notes || existingVehicle.notes,
            },
            include: {
              customer: true,
              center: true,
            },
          });

          // Automatically transition from RECEIVED to WASHING
          setTimeout(async () => {
            try {
              await context.prisma.vehicle.update({
                where: { id: updatedVehicle.id },
                data: {
                  status: VehicleStatus.WASHING,
                  washingAt: new Date(),
                },
              });
              console.log(`✅ Vehicle ${updatedVehicle.vehicleNumber} automatically transitioned to WASHING`);
            } catch (error) {
              console.error('Failed to auto-transition vehicle to WASHING:', error);
            }
          }, 2000);

          // Send SMS notification
          if (updatedVehicle.customer?.name && center?.name) {
            await sendVehicleReceivedSms(
              updatedVehicle.customer.mobile,
              updatedVehicle.customer.name,
              updatedVehicle.vehicleNumber,
              center.name
            );
          }

          return updatedVehicle;
        }
        
        // For non-REGISTERED vehicles or non-staff users, throw error
        throw new Error('This vehicle is already in the system and has not been delivered yet.');
      }
      
      // If user is a customer, they can only add vehicles for themselves
      // If user is staff, they can add vehicles for any customer
      
      let customerData: { id: string; mobile: string; name: string | null };
      if (isStaff) {
        // Staff can add vehicles for any customer (using customerMobile from input)
        let customer = await context.prisma.user.findUnique({
          where: { mobile: input.customerMobile },
        });

        if (!customer) {
          customer = await context.prisma.user.create({
            data: {
              mobile: input.customerMobile,
              name: input.customerName,
              role: UserRole.CUSTOMER,
            },
          });
        }
        customerData = customer;
      } else {
        // Customer can only add vehicles for themselves
        const fullUser = await context.prisma.user.findUnique({
          where: { id: context.user!.id },
        });
        customerData = fullUser!;
      }

      // Get center info for SMS and slot checking
      const center = await context.prisma.center.findUnique({
        where: { id: input.centerId },
      });

      // If staff is adding, mark as RECEIVED with receivedAt timestamp
      // If customer is adding, mark as REGISTERED (no receivedAt yet)
      const vehicleData: any = {
        vehicleNumber: input.vehicleNumber,
        vehicleType: input.vehicleType,
        carCategory: input.carCategory,
        model: input.model,
        brand: input.brand,
        color: input.color,
        serviceType: input.serviceType || ServiceType.WASH,
        notes: input.notes,
        customerId: customerData.id,
        centerId: input.centerId,
      };

      if (isStaff) {
        // Staff is adding - vehicle is received at center
        vehicleData.status = 'RECEIVED';
        vehicleData.receivedAt = new Date();
        
        // Check if slots are available based on vehicle type
        const center = await context.prisma.center.findUnique({
          where: { id: input.centerId },
        });
        
        if (!center) {
          throw new Error('Wash center not found');
        }
        
        const isTwoWheeler = input.vehicleType === 'TWO_WHEELER';
        const availableSlots = isTwoWheeler 
          ? center.availableSlotsTwoWheeler 
          : center.availableSlotsCar;
        
        if (availableSlots <= 0) {
          const vehicleTypeName = isTwoWheeler ? 'two-wheeler' : 'car';
          throw new Error(`No ${vehicleTypeName} slots available for today. All slots are full.`);
        }
        
        // Decrement available slots for the specific vehicle type
        await context.prisma.center.update({
          where: { id: input.centerId },
          data: isTwoWheeler 
            ? { availableSlotsTwoWheeler: { decrement: 1 } }
            : { availableSlotsCar: { decrement: 1 } },
        });
      } else {
        // Customer is adding - vehicle is just registered
        vehicleData.status = 'REGISTERED';
        // receivedAt will be set when staff marks it as received
      }

      const vehicle = await context.prisma.vehicle.create({
        data: vehicleData,
        include: {
          customer: true,
          center: true,
        },
      });

      // Automatically transition from RECEIVED to WASHING after entry
      if (isStaff && vehicleData.status === 'RECEIVED') {
        const serviceType = input.serviceType || ServiceType.WASH;
        
        // For WASH service, transition to WASHING
        // For BODY_REPAIR service, transition to BODY_REPAIR_ASSESSMENT
        setTimeout(async () => {
          try {
            const nextStatus = serviceType === ServiceType.WASH 
              ? VehicleStatus.WASHING 
              : VehicleStatus.BODY_REPAIR_ASSESSMENT;
            
            const updateData: any = { status: nextStatus };
            
            if (serviceType === ServiceType.WASH) {
              updateData.washingAt = new Date();
            } else {
              updateData.bodyRepairAssessmentAt = new Date();
            }
            
            await context.prisma.vehicle.update({
              where: { id: vehicle.id },
              data: updateData,
            });
            console.log(`✅ Vehicle ${vehicle.vehicleNumber} automatically transitioned to ${nextStatus}`);
          } catch (error) {
            console.error('Failed to auto-transition vehicle:', error);
          }
        }, 2000); // 2 seconds delay
      }

      // Send SMS notification only if staff added the vehicle (actually received)
      if (isStaff && customerData.name && center?.name) {
        await sendVehicleReceivedSms(
          customerData.mobile,
          customerData.name,
          vehicle.vehicleNumber,
          center.name
        );
      }

      return vehicle;
    },

    // Update vehicle status
    updateVehicleStatus: async (_: any, { input }: any, context: Context) => {
      const user = requireStaff(context);
      
      const updateData: any = {
        status: input.status,
        ...(input.notes && { notes: input.notes }),
      };

      // Update timestamps based on status
      if (input.status === VehicleStatus.WASHING) {
        updateData.washingAt = new Date();
      } else if (input.status === VehicleStatus.BODY_REPAIR_ASSESSMENT) {
        updateData.bodyRepairAssessmentAt = new Date();
      } else if (input.status === VehicleStatus.BODY_REPAIR_IN_PROGRESS) {
        updateData.bodyRepairInProgressAt = new Date();
      } else if (input.status === VehicleStatus.BODY_REPAIR_PAINTING) {
        updateData.bodyRepairPaintingAt = new Date();
      } else if (input.status === VehicleStatus.BODY_REPAIR_COMPLETE) {
        updateData.bodyRepairCompleteAt = new Date();
      } else if (input.status === VehicleStatus.READY_FOR_PICKUP) {
        updateData.readyAt = new Date();
        
        // Fetch vehicle details before update for SMS
        const vehicle = await context.prisma.vehicle.findUnique({
          where: { id: input.vehicleId },
          include: { customer: true, center: true, payment: true },
        });
        
        const amount = vehicle?.payment?.amount || 0;
        
        // Send SMS notification to customer
        if (vehicle && vehicle.customer.name && vehicle.center.name) {
          await sendVehicleReadySms(
            vehicle.customer.mobile,
            vehicle.customer.name,
            vehicle.vehicleNumber,
            vehicle.center.name,
            amount
          );
        }

        // Send push notification if FCM token available
        if (vehicle?.customer.fcmToken) {
          await sendVehicleReadyNotification(
            vehicle.customer.fcmToken,
            vehicle.vehicleNumber,
            amount
          );
        }
      } else if (input.status === VehicleStatus.DELIVERED) {
        updateData.deliveredAt = new Date();
        
        // Increment available slots when vehicle is delivered (picked up)
        const vehicle = await context.prisma.vehicle.findUnique({
          where: { id: input.vehicleId },
          include: { center: true },
        });
        
        if (vehicle) {
          const isTwoWheeler = vehicle.vehicleType === 'TWO_WHEELER';
          await context.prisma.center.update({
            where: { id: vehicle.centerId },
            data: isTwoWheeler
              ? { availableSlotsTwoWheeler: { increment: 1 } }
              : { availableSlotsCar: { increment: 1 } },
          });
        }
      }

      return await context.prisma.vehicle.update({
        where: { id: input.vehicleId },
        data: updateData,
        include: {
          customer: true,
          worker: true,
          payment: true,
        },
      });
    },

    // Assign vehicle to worker
    assignVehicleToWorker: async (_: any, { vehicleId, workerId }: any, context: Context) => {
      requireAdmin(context);
      
      return await context.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { workerId },
        include: {
          customer: true,
          worker: true,
        },
      });
    },

    // Update pricing
    updatePricing: async (_: any, { input }: any, context: Context) => {
      requireAdmin(context);
      
      return await context.prisma.pricing.upsert({
        where: {
          vehicleType_carCategory: {
            vehicleType: input.vehicleType,
            carCategory: input.carCategory || null,
          },
        },
        update: {
          price: input.price,
          description: input.description,
        },
        create: {
          vehicleType: input.vehicleType,
          carCategory: input.carCategory,
          price: input.price,
          description: input.description,
        },
      });
    },

    // Delete pricing
    deletePricing: async (_: any, { id }: any, context: Context) => {
      requireAdmin(context);
      
      await context.prisma.pricing.update({
        where: { id },
        data: { isActive: false },
      });
      
      return true;
    },

    // Mark payment
    markPayment: async (_: any, { input }: any, context: Context) => {
      requireStaff(context);
      
      const vehicle = await context.prisma.vehicle.findUnique({
        where: { id: input.vehicleId },
      });

      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      const status =
        input.method === 'MANUAL_UPI' || input.method === 'MANUAL_GPAY'
          ? PaymentStatus.MANUAL_PENDING
          : PaymentStatus.PAID;

      return await context.prisma.payment.create({
        data: {
          amount: input.amount,
          method: input.method,
          status,
          transactionId: input.transactionId,
          upiId: input.upiId,
          screenshotUrl: input.screenshotUrl,
          notes: input.notes,
          vehicleId: input.vehicleId,
          customerId: vehicle.customerId,
        },
        include: {
          vehicle: true,
          customer: true,
        },
      });
    },

    // Verify manual payment
    verifyManualPayment: async (_: any, { input }: any, context: Context) => {
      const user = requireAdmin(context);
      
      return await context.prisma.payment.update({
        where: { id: input.paymentId },
        data: {
          status: input.approved ? PaymentStatus.PAID : PaymentStatus.REJECTED,
          verifiedBy: user.id,
          verifiedAt: new Date(),
          notes: input.notes,
        },
        include: {
          vehicle: true,
          customer: true,
        },
      });
    },

    // Create Razorpay order
    createRazorpayOrder: async (_: any, { vehicleId, amount }: any, context: Context) => {
      requireAuth(context);
      
      // TODO: Implement Razorpay order creation
      // const Razorpay = require('razorpay');
      // const razorpay = new Razorpay({
      //   key_id: process.env.RAZORPAY_KEY_ID,
      //   key_secret: process.env.RAZORPAY_KEY_SECRET,
      // });
      
      // const order = await razorpay.orders.create({
      //   amount: amount * 100,
      //   currency: 'INR',
      //   receipt: vehicleId,
      // });
      
      return 'order_mock_id_' + Math.random().toString(36).substr(2, 9);
    },

    // Create payment when customer selects payment method
    createPayment: async (_: any, { input }: any, context: Context) => {
      const user = requireAuth(context);
      
      const vehicle = await context.prisma.vehicle.findUnique({
        where: { id: input.vehicleId },
        include: { customer: true },
      });

      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      if (vehicle.customerId !== user.id) {
        throw new Error('Not authorized to create payment for this vehicle');
      }

      // Check if payment already exists
      const existingPayment = await context.prisma.payment.findUnique({
        where: { vehicleId: input.vehicleId },
      });

      if (existingPayment) {
        throw new Error('Payment already exists for this vehicle');
      }

      // Get pricing
      const pricing = await context.prisma.pricing.findFirst({
        where: {
          vehicleType: vehicle.vehicleType,
          carCategory: vehicle.carCategory,
          isActive: true,
        },
      });

      if (!pricing) {
        throw new Error('Pricing not configured for this vehicle type');
      }

      // Determine payment mode
      const paymentMode = input.method === 'ONLINE' ? 'GATEWAY' : 'MANUAL';
      const status = input.method === 'ONLINE' ? PaymentStatus.PENDING : PaymentStatus.MANUAL_PENDING;

      return await context.prisma.payment.create({
        data: {
          amount: pricing.price,
          method: input.method,
          paymentMode,
          status,
          vehicleId: input.vehicleId,
          customerId: vehicle.customerId,
        },
        include: {
          vehicle: true,
          customer: true,
        },
      });
    },

    // Confirm online payment after Razorpay success
    confirmOnlinePayment: async (_: any, { paymentId, razorpayPaymentId, razorpaySignature }: any, context: Context) => {
      const user = requireAuth(context);
      
      const payment = await context.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { vehicle: true },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.customerId !== user.id) {
        throw new Error('Not authorized');
      }

      // TODO: Verify Razorpay signature
      // const crypto = require('crypto');
      // const generatedSignature = crypto
      //   .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      //   .update(payment.razorpayOrderId + '|' + razorpayPaymentId)
      //   .digest('hex');
      
      // if (generatedSignature !== razorpaySignature) {
      //   throw new Error('Payment verification failed');
      // }

      return await context.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.PAID,
          razorpayPaymentId,
          razorpaySignature,
        },
        include: {
          vehicle: true,
          customer: true,
        },
      });
    },

    // Confirm manual payment (Cash/GPay) by staff
    confirmManualPayment: async (_: any, { input }: any, context: Context) => {
      const user = requireStaff(context);
      
      const payment = await context.prisma.payment.findUnique({
        where: { id: input.paymentId },
        include: { vehicle: true },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.paymentMode !== 'MANUAL') {
        throw new Error('This payment is not a manual payment');
      }

      return await context.prisma.payment.update({
        where: { id: input.paymentId },
        data: {
          amount: input.amount,
          status: PaymentStatus.PAID,
          verifiedBy: user.id,
          verifiedAt: new Date(),
          notes: input.notes,
        },
        include: {
          vehicle: true,
          customer: true,
        },
      });
    },

    // Create worker (Admin only) - Returns credentials for SMS/display
    createWorker: async (_: any, { input }: any, context: Context) => {
      requireAdmin(context);
      
      // Generate worker code if not provided
      const workerCode = input.workerCode || `WRK${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Generate password from worker name: lowercase name + @321
      const generatedPassword = input.name 
        ? `${input.name.toLowerCase().trim().replace(/\s+/g, '')}@321`
        : `worker@321`;
      
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      const worker = await context.prisma.user.create({
        data: {
          mobile: input.mobile,
          name: input.name,
          email: input.email,
          password: hashedPassword,
          role: UserRole.WORKER,
          workerCode,
        },
      });

      // Get shop name for SMS
      const center = await context.prisma.center.findFirst({
        where: { isActive: true },
      });

      // Send credentials via SMS
      if (center?.name) {
        await sendWorkerCredentialsSms(
          worker.mobile,
          generatedPassword, // Send plain password in SMS
          workerCode,
          center.name
        );
      }

      // Return worker with plain password for admin to display/download
      return {
        user: worker,
        plainPassword: generatedPassword,
        workerCode,
      };
    },

    // Send worker credentials SMS (Admin only)
    sendWorkerCredentialsSms: async (_: any, { mobile, workerCode, password }: any, context: Context) => {
      requireAdmin(context);

      const center = await context.prisma.center.findFirst({
        where: { isActive: true },
      });

      if (!center) {
        throw new Error('No active wash center found');
      }

      await sendWorkerCredentialsSms(mobile, password, workerCode, center.name);
      
      return true;
    },

    // Toggle worker status (Admin only)
    toggleWorkerStatus: async (_: any, { userId }: any, context: Context) => {
      requireAdmin(context);

      const user = await context.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const updatedUser = await context.prisma.user.update({
        where: { id: userId },
        data: { isActive: !user.isActive },
      });

      return updatedUser;
    },

    // Update user
    updateUser: async (_: any, { input }: any, context: Context) => {
      requireAuth(context);
      
      // Users can only update their own profile (name, email)
      // Admins can update any user and change isActive status
      if (context.user!.id !== input.userId && context.user!.role !== UserRole.ADMIN) {
        throw new Error('You can only update your own profile');
      }

      // Only admins can change isActive status
      if (input.isActive !== undefined && context.user!.role !== UserRole.ADMIN) {
        throw new Error('Admin access required to change user status');
      }

      // If mobile is being changed, check if it's unique
      if (input.mobile) {
        const existingUser = await context.prisma.user.findUnique({
          where: { mobile: input.mobile },
        });
        if (existingUser && existingUser.id !== input.userId) {
          throw new Error('This mobile number is already registered');
        }
      }
      
      return await context.prisma.user.update({
        where: { id: input.userId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.email && { email: input.email }),
          ...(input.mobile && { mobile: input.mobile }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
      });
    },

    // Delete user
    deleteUser: async (_: any, { userId }: any, context: Context) => {
      requireAdmin(context);
      
      await context.prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });
      
      return true;
    },

    // Update company logo (Admin only)
    updateCompanyLogo: async (_: any, { input }: any, context: Context) => {
      requireAdmin(context);

      // Get the first center (for single-center setups)
      const center = await context.prisma.center.findFirst();
      
      if (!center) {
        throw new Error('No wash center found');
      }

      const centerId = input.centerId || center.id;

      return await context.prisma.center.update({
        where: { id: centerId },
        data: { logoUrl: input.logoUrl },
      });
    },

    // Update center information (Admin only)
    updateCenter: async (_: any, { input }: any, context: Context) => {
      requireAdmin(context);

      // Get the first center (for single-center setups)
      const center = await context.prisma.center.findFirst();
      
      if (!center) {
        throw new Error('No wash center found');
      }

      const centerId = input.centerId || center.id;

      return await context.prisma.center.update({
        where: { id: centerId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.address && { address: input.address }),
          ...(input.mobile && { mobile: input.mobile }),
          ...(input.email && { email: input.email }),
        },
      });
    },

    // Update center slots (Admin/Worker)
    updateCenterSlots: async (_: any, { dailySlotsTwoWheeler, dailySlotsCar }: any, context: Context) => {
      requireStaff(context);

      if (dailySlotsTwoWheeler < 0 || dailySlotsCar < 0) {
        throw new Error('Daily slots cannot be negative');
      }

      // Get the first center (for single-center setups)
      const center = await context.prisma.center.findFirst();
      
      if (!center) {
        throw new Error('No wash center found');
      }

      return await context.prisma.center.update({
        where: { id: center.id },
        data: { 
          dailySlotsTwoWheeler,
          availableSlotsTwoWheeler: dailySlotsTwoWheeler, // Reset available slots to new daily limit
          dailySlotsCar,
          availableSlotsCar: dailySlotsCar, // Reset available slots to new daily limit
        },
      });
    },
  },

  // Field resolvers
  Vehicle: {
    washCount: async (parent: any, _: any, context: Context) => {
      // Count how many times this vehicle number has been delivered (completed washes)
      const count = await context.prisma.vehicle.count({
        where: {
          vehicleNumber: parent.vehicleNumber,
          status: VehicleStatus.DELIVERED,
        },
      });
      return count;
    },
  },
};
