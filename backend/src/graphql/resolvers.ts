import { PrismaClient } from '@prisma/client';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  sendVehicleReceivedSms,
  sendVehicleReadySms,
  sendWorkerCredentialsSms,
  sendOtpSms,
  sendPaymentSuccessSms,
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

const SlotBookingStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
};

const prisma = new PrismaClient();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
        include: {
          vehicles: true,
        },
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

    // Get my payments (customer)
    myPayments: async (_: any, __: any, context: Context) => {
      try {
        const user = requireAuth(context);
        console.log('myPayments query - User ID:', user.id);
        
        const payments = await context.prisma.payment.findMany({
          where: { customerId: user.id },
          include: {
            vehicle: true,
          },
          orderBy: { createdAt: 'desc' },
        });
        
        console.log('myPayments query - Found payments:', payments.length);
        return payments;
      } catch (error) {
        console.error('myPayments error:', error);
        throw error;
      }
    },

    // Get centers
    centers: async (_: any, __: any, context: Context) => {
      return await context.prisma.center.findMany({
        where: { isActive: true },
      });
    },

    slotBookings: async (_: any, { status }: any, context: Context) => {
      requireStaff(context);

      const where: any = {};
      if (status) {
        where.status = status;
      }

      return await context.prisma.slotBooking.findMany({
        where,
        include: { center: true },
        orderBy: { createdAt: 'desc' },
      });
    },

    mySlotBookings: async (_: any, __: any, context: Context) => {
      requireAuth(context);

      return await context.prisma.slotBooking.findMany({
        where: { customerMobile: context.user!.mobile },
        include: { center: true },
        orderBy: { createdAt: 'desc' },
      });
    },

    slotBookingById: async (_: any, { id }: any, context: Context) => {
      requireAuth(context);

      const booking = await context.prisma.slotBooking.findUnique({
        where: { id },
        include: { center: true },
      });

      if (!booking) {
        return null;
      }

      const isCustomer = context.user!.role === UserRole.CUSTOMER;
      if (isCustomer && booking.customerMobile !== context.user!.mobile) {
        throw new Error('Unauthorized');
      }

      return booking;
    },

    systemConfig: async (_: any, { key }: any, context: Context) => {
      const config = await context.prisma.systemConfig.findUnique({
        where: { key },
      });

      return config || { key, value: 'false' };
    },

    appVersion: async (_: any, __: any, context: Context) => {
      // Get version configs from database
      const companyVersionConfig = await context.prisma.systemConfig.findUnique({
        where: { key: 'COMPANY_APP_VERSION' },
      });
      const customerVersionConfig = await context.prisma.systemConfig.findUnique({
        where: { key: 'CUSTOMER_APP_VERSION' },
      });
      const companyDownloadConfig = await context.prisma.systemConfig.findUnique({
        where: { key: 'COMPANY_APP_DOWNLOAD_URL' },
      });
      const customerDownloadConfig = await context.prisma.systemConfig.findUnique({
        where: { key: 'CUSTOMER_APP_DOWNLOAD_URL' },
      });
      const forceUpdateConfig = await context.prisma.systemConfig.findUnique({
        where: { key: 'FORCE_UPDATE' },
      });
      const updateMessageConfig = await context.prisma.systemConfig.findUnique({
        where: { key: 'UPDATE_MESSAGE' },
      });
      const releaseNotesConfig = await context.prisma.systemConfig.findUnique({
        where: { key: 'RELEASE_NOTES' },
      });

      return {
        companyApp: companyVersionConfig?.value || '1.0.0',
        customerApp: customerVersionConfig?.value || '1.0.0',
        companyAppDownloadUrl: companyDownloadConfig?.value || null,
        customerAppDownloadUrl: customerDownloadConfig?.value || null,
        forceUpdate: forceUpdateConfig?.value === 'true',
        updateMessage: updateMessageConfig?.value || 'A new version is available. Please update to continue.',
        releaseNotes: releaseNotesConfig?.value || null,
      };
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

      // Check if user exists and is a worker or admin
      if (user && (user.role === UserRole.WORKER || user.role === UserRole.ADMIN)) {
        throw new Error('This mobile number is registered as staff. Please use the company app to login with your credentials.');
      }

      if (!user) {
        user = await context.prisma.user.create({
          data: {
            mobile,
            role: UserRole.CUSTOMER,
          },
        });
      }

      // Generate JWT token
      const signOptions: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any };
      const token = jwt.sign(
        { id: user.id, mobile: user.mobile, role: user.role },
        process.env.JWT_SECRET!,
        signOptions
      );

      return { token, user };
    },

    // Login with password (for admin/worker and customers with password)
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

      const signOptions: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any };
      const token = jwt.sign(
        { id: user.id, mobile: user.mobile, role: user.role },
        process.env.JWT_SECRET!,
        signOptions
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
      const signOptions: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any };
      const token = jwt.sign(
        { id: user.id, mobile: user.mobile, role: user.role },
        process.env.JWT_SECRET!,
        signOptions
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
              photoUrl: input.photoUrl || existingVehicle.photoUrl,
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
        photoUrl: input.photoUrl,
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
          const currentAvailable = isTwoWheeler 
            ? vehicle.center.availableSlotsTwoWheeler
            : vehicle.center.availableSlotsCar;
          const dailyLimit = isTwoWheeler
            ? vehicle.center.dailySlotsTwoWheeler
            : vehicle.center.dailySlotsCar;
          
          // Only increment if we haven't reached the daily limit
          if (currentAvailable < dailyLimit) {
            await context.prisma.center.update({
              where: { id: vehicle.centerId },
              data: isTwoWheeler
                ? { availableSlotsTwoWheeler: { increment: 1 } }
                : { availableSlotsCar: { increment: 1 } },
            });
          }
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
      
      const updatedPayment = await context.prisma.payment.update({
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

      // Send payment success SMS if approved
      if (input.approved && updatedPayment.customer?.name) {
        await sendPaymentSuccessSms(
          updatedPayment.customer.mobile,
          updatedPayment.customer.name,
          updatedPayment.vehicle.vehicleNumber,
          updatedPayment.amount,
          'Manual Payment (Verified)'
        );
      }

      return updatedPayment;
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
      try {
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

        const payment = await context.prisma.payment.create({
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

        console.log(`✅ Payment created: ${payment.id} for vehicle ${vehicle.id}, method: ${input.method}`);
        return payment;
      } catch (error: any) {
        console.error('❌ Error in createPayment:', error.message);
        throw error;
      }
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

      const updatedPayment = await context.prisma.payment.update({
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

      // Send payment success SMS
      if (updatedPayment.customer?.name) {
        await sendPaymentSuccessSms(
          updatedPayment.customer.mobile,
          updatedPayment.customer.name,
          updatedPayment.vehicle.vehicleNumber,
          updatedPayment.amount,
          'Online Payment'
        );
      }

      return updatedPayment;
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

      const updatedPayment = await context.prisma.payment.update({
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

      // Send payment success SMS
      if (updatedPayment.customer?.name) {
        const paymentMethod = payment.method === 'CASH' ? 'Cash' : 'GPay/UPI';
        await sendPaymentSuccessSms(
          updatedPayment.customer.mobile,
          updatedPayment.customer.name,
          updatedPayment.vehicle.vehicleNumber,
          updatedPayment.amount,
          paymentMethod
        );
      }

      return updatedPayment;
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
          ...(input.dateOfBirth && { dateOfBirth: input.dateOfBirth }),
          ...(input.address && { address: input.address }),
          ...(input.city && { city: input.city }),
          ...(input.pinCode && { pinCode: input.pinCode }),
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

      const center = await context.prisma.center.findFirst();
      
      if (!center) {
        throw new Error('No wash center found');
      }

      // Count vehicles in READY_FOR_PICKUP status (slots still occupied)
      const [readyTwoWheelerCount, readyCarCount] = await Promise.all([
        context.prisma.vehicle.count({
          where: {
            status: VehicleStatus.READY_FOR_PICKUP,
            vehicleType: 'TWO_WHEELER',
            centerId: center.id,
          },
        }),
        context.prisma.vehicle.count({
          where: {
            status: VehicleStatus.READY_FOR_PICKUP,
            vehicleType: {
              in: ['CAR', 'FOUR_WHEELER'],
            },
            centerId: center.id,
          },
        }),
      ]);

      // Check if trying to decrement slots below occupied count
      const isDecreasingTwoWheeler = dailySlotsTwoWheeler < center.dailySlotsTwoWheeler;
      const isDecreasingCar = dailySlotsCar < center.dailySlotsCar;

      if (isDecreasingTwoWheeler && dailySlotsTwoWheeler < readyTwoWheelerCount) {
        throw new Error(
          `Cannot set two-wheeler slots to ${dailySlotsTwoWheeler}. There are ${readyTwoWheelerCount} two-wheeler(s) in READY FOR PICKUP status occupying slots.`
        );
      }

      if (isDecreasingCar && dailySlotsCar < readyCarCount) {
        throw new Error(
          `Cannot set car slots to ${dailySlotsCar}. There are ${readyCarCount} car(s) in READY FOR PICKUP status occupying slots.`
        );
      }

      // Calculate available slots based on occupied slots
      const availableTwoWheeler = Math.max(0, dailySlotsTwoWheeler - readyTwoWheelerCount);
      const availableCar = Math.max(0, dailySlotsCar - readyCarCount);

      const updatedCenter = await context.prisma.center.update({
        where: { id: center.id },
        data: { 
          dailySlotsTwoWheeler,
          availableSlotsTwoWheeler: availableTwoWheeler,
          dailySlotsCar,
          availableSlotsCar: availableCar,
        },
      });

      console.log(
        `[Slot Update] Two-Wheeler: ${dailySlotsTwoWheeler} total (${readyTwoWheelerCount} occupied, ${availableTwoWheeler} available) | ` +
        `Car: ${dailySlotsCar} total (${readyCarCount} occupied, ${availableCar} available)`
      );

      return updatedCenter;
    },

    createSlotBooking: async (_: any, { input }: any, context: Context) => {
      requireAuth(context);

      const enableSlotBooking = await context.prisma.systemConfig.findUnique({
        where: { key: 'ENABLE_SLOT_BOOKING' },
      });

      if (enableSlotBooking?.value !== 'true') {
        throw new Error('Slot booking is currently disabled');
      }

      const center = await context.prisma.center.findUnique({
        where: { id: input.centerId },
      });

      if (!center) {
        throw new Error('Wash center not found');
      }

      if (!input.carWash && !input.twoWheelerWash && !input.bodyRepair) {
        throw new Error('Please select at least one service type');
      }

      // Check if vehicle already has an active booking (PENDING or VERIFIED)
      const existingBooking = await context.prisma.slotBooking.findFirst({
        where: {
          vehicleNumber: input.vehicleNumber.toUpperCase(),
          status: {
            in: ['PENDING', 'VERIFIED'],
          },
        },
      });

      if (existingBooking) {
        throw new Error(
          `This vehicle (${input.vehicleNumber}) already has an active booking. Please wait until it's processed or cancelled.`
        );
      }

      // Check if vehicle is currently being serviced (not yet delivered)
      const existingVehicle = await context.prisma.vehicle.findFirst({
        where: {
          vehicleNumber: input.vehicleNumber.toUpperCase(),
          status: {
            not: VehicleStatus.DELIVERED,
          },
        },
      });

      if (existingVehicle) {
        const statusText = existingVehicle.status === VehicleStatus.READY_FOR_PICKUP 
          ? 'ready for pickup' 
          : 'being serviced';
        throw new Error(
          `This vehicle (${input.vehicleNumber}) is currently ${statusText}. Cannot book a new slot until the vehicle is delivered.`
        );
      }

      // Check slot availability before creating booking
      const isTwoWheeler = input.vehicleType === 'TWO_WHEELER';
      const availableSlots = isTwoWheeler 
        ? center.availableSlotsTwoWheeler 
        : center.availableSlotsCar;
      
      if (availableSlots <= 0) {
        throw new Error('Slots are full, please come back later');
      }

      const otp = generateOTP();

      // Decrement available slots when booking is created
      await context.prisma.center.update({
        where: { id: input.centerId },
        data: isTwoWheeler 
          ? { availableSlotsTwoWheeler: { decrement: 1 } }
          : { availableSlotsCar: { decrement: 1 } },
      });

      const booking = await context.prisma.slotBooking.create({
        data: {
          customerMobile: input.customerMobile,
          customerName: input.customerName,
          vehicleNumber: input.vehicleNumber,
          vehicleType: input.vehicleType,
          carCategory: input.carCategory,
          brand: input.brand,
          model: input.model,
          color: input.color,
          photoUrl: input.photoUrl,
          carWash: input.carWash || false,
          twoWheelerWash: input.twoWheelerWash || false,
          bodyRepair: input.bodyRepair || false,
          otp,
          centerId: input.centerId,
        },
        include: { center: true },
      });

      console.log(`[Slot Booking] Created booking ${booking.id} - Slot decremented for ${input.vehicleType}`);

      return booking;
    },

    verifySlotBooking: async (_: any, { input }: any, context: Context) => {
      requireStaff(context);

      const booking = await context.prisma.slotBooking.findUnique({
        where: { id: input.bookingId },
        include: { center: true },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.status !== SlotBookingStatus.PENDING) {
        throw new Error('Booking has already been processed');
      }

      if (booking.otp !== input.otp) {
        throw new Error('Invalid OTP');
      }

      let customer = await context.prisma.user.findUnique({
        where: { mobile: booking.customerMobile },
      });

      if (!customer) {
        customer = await context.prisma.user.create({
          data: {
            mobile: booking.customerMobile,
            name: booking.customerName,
            role: UserRole.CUSTOMER,
          },
        });
      }

      // Slot was already decremented during createSlotBooking
      await context.prisma.slotBooking.update({
        where: { id: booking.id },
        data: {
          status: SlotBookingStatus.VERIFIED,
          verifiedAt: new Date(),
          verifiedBy: context.user!.id,
        },
      });

      const serviceType = booking.bodyRepair ? ServiceType.BODY_REPAIR : ServiceType.WASH;

      const vehicle = await context.prisma.vehicle.create({
        data: {
          vehicleNumber: booking.vehicleNumber,
          vehicleType: booking.vehicleType,
          carCategory: booking.carCategory,
          model: booking.model,
          brand: booking.brand,
          color: booking.color,
          photoUrl: booking.photoUrl,
          serviceType,
          status: VehicleStatus.RECEIVED,
          receivedAt: new Date(),
          customerId: customer.id,
          centerId: booking.centerId,
        },
        include: {
          customer: true,
          center: true,
        },
      });

      setTimeout(async () => {
        try {
          const nextStatus = serviceType === ServiceType.WASH 
            ? VehicleStatus.WASHING 
            : VehicleStatus.BODY_REPAIR_ASSESSMENT;
          
          await context.prisma.vehicle.update({
            where: { id: vehicle.id },
            data: { status: nextStatus },
          });
        } catch (error) {
          console.error('Failed to auto-transition vehicle:', error);
        }
      }, 2000);

      if (vehicle.customer?.name && booking.center?.name) {
        await sendVehicleReceivedSms(
          vehicle.customer.mobile,
          vehicle.customer.name,
          vehicle.vehicleNumber,
          booking.center.name
        );
      }

      return vehicle;
    },

    cancelSlotBooking: async (_: any, { bookingId }: any, context: Context) => {
      requireAuth(context);

      const booking = await context.prisma.slotBooking.findUnique({
        where: { id: bookingId },
        include: { center: true },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      const isCustomer = context.user!.role === UserRole.CUSTOMER;
      if (isCustomer && booking.customerMobile !== context.user!.mobile) {
        throw new Error('Unauthorized');
      }

      if (booking.status !== SlotBookingStatus.PENDING) {
        throw new Error('Only pending bookings can be cancelled');
      }

      // Restore slot availability when cancelling
      const isTwoWheeler = booking.vehicleType === 'TWO_WHEELER';
      const slotField = isTwoWheeler
        ? 'availableSlotsTwoWheeler'
        : 'availableSlotsCar';
      const dailySlotField = isTwoWheeler
        ? 'dailySlotsTwoWheeler'
        : 'dailySlotsCar';

      const currentAvailable = booking.center[slotField];
      const dailyLimit = booking.center[dailySlotField];

      // Only increment if we haven't reached the daily limit
      if (currentAvailable < dailyLimit) {
        await context.prisma.center.update({
          where: { id: booking.centerId },
          data: {
            [slotField]: {
              increment: 1,
            },
          },
        });
        console.log(`[Slot Booking] Slot restored for cancelled booking ${bookingId}`);
      }

      const updatedBooking = await context.prisma.slotBooking.update({
        where: { id: bookingId },
        data: { status: SlotBookingStatus.CANCELLED },
        include: { center: true },
      });

      return updatedBooking;
    },

    updateSystemConfig: async (_: any, { key, value }: any, context: Context) => {
      requireAdmin(context);

      return await context.prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    },

    sendBroadcastNotification: async (_: any, { title, message }: any, context: Context) => {
      try {
        requireAdmin(context);
      } catch (error) {
        console.error('❌ Auth check failed:', error);
        throw error;
      }

      try {
        console.log(`📢 Broadcasting notification: "${title}" to all customers...`);
        
        // Get all customers with FCM tokens
        const customers = await context.prisma.user.findMany({
          where: {
            role: UserRole.CUSTOMER,
            fcmToken: {
              not: null,
            },
          },
          select: {
            id: true,
            name: true,
            fcmToken: true,
          },
        });

        console.log(`📊 Found ${customers.length} customers with FCM tokens`);

        if (customers.length === 0) {
          return {
            success: true,
            sentCount: 0,
            failedCount: 0,
          };
        }

        // Send notification to each customer
        let sentCount = 0;
        let failedCount = 0;

        const { sendPushNotification } = await import('../services/fcm.service');
        const { sendExpoPushNotification } = await import('../services/expo-push.service');

        for (const customer of customers) {
          if (customer.fcmToken) {
            try {
              let success = false;
              
              // Check if it's an Expo push token (for testing in Expo Go)
              if (customer.fcmToken.startsWith('ExponentPushToken[')) {
                console.log(`📱 Sending Expo notification to ${customer.name}...`);
                success = await sendExpoPushNotification(customer.fcmToken, title, message);
              } else {
                // Use Firebase FCM for production tokens
                console.log(`📱 Sending FCM notification to ${customer.name}...`);
                success = await sendPushNotification(customer.fcmToken, {
                  title,
                  body: message,
                  data: {
                    type: 'BROADCAST',
                    timestamp: new Date().toISOString(),
                  },
                });
              }

              if (success) {
                sentCount++;
              } else {
                failedCount++;
              }
            } catch (error) {
              console.error(`Failed to send notification to ${customer.name}:`, error);
              failedCount++;
            }
          }
        }

        console.log(`✅ Broadcast notification sent: ${sentCount} succeeded, ${failedCount} failed`);

        return {
          success: true,
          sentCount,
          failedCount,
        };
      } catch (error) {
        console.error('❌ Error sending broadcast notification:', error);
        throw new Error('Failed to send broadcast notification');
      }
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
