/**
 * Helper script to update resolvers.ts with multi-tenant support
 * This documents the changes needed for center isolation
 */

// STEP 1: Add import at the top of resolvers.ts
import { requireCenterId, requireOwnCenter, getCenterIdOptional, isSuperAdmin } from '../middleware/center-isolation';

// STEP 2: Update Context interface to match index.ts
interface Context {
  user?: {
    id: string;
    mobile: string;
    role: string;
    name?: string;
    centerId?: string;
  };
  centerId?: string; // Add this field
  prisma: PrismaClient;
}

// STEP 3: Key Query Updates (add centerId filtering):

/*
pricing: async (_: any, __: any, context: Context) => {
  const centerId = requireCenterId(context); // Enforce center check
  return await context.prisma.pricing.findMany({
    where: { 
      centerId,  // ← Filter by centerId
      isActive: true 
    },
    orderBy: { vehicleType: 'asc' },
  });
},

pricingByType: async (_: any, { vehicleType, carCategory }: any, context: Context) => {
  const centerId = requireCenterId(context);
  return await context.prisma.pricing.findFirst({
    where: {
      centerId,  // ← Filter by centerId
      vehicleType,
      carCategory,
      isActive: true,
    },
  });
},

workers: async (_: any, __: any, context: Context) => {
  requireAdmin(context);
  const centerId = requireCenterId(context);
  
  return await context.prisma.user.findMany({
    where: { 
      role: UserRole.WORKER,
      centerId  // ← Filter by centerId
    },
    orderBy: { createdAt: 'desc' },
  });
},

vehicles: async (_: any, { status, limit = 100, offset = 0 }: any, context: Context) => {
  const centerId = requireCenterId(context);
  
  const where: any = { centerId }; // ← Always filter by centerId
  if (status) {
    where.status = status;
  }

  return await context.prisma.vehicle.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      customer: true,
      worker: true,
      payment: true,
      pricing: true,
    },
  });
},

slotBookings: async (_: any, { status, limit = 100, offset = 0 }: any, context: Context) => {
  const centerId = requireCenterId(context);
  
  const where: any = { centerId }; // ← Always filter by centerId
  if (status) {
    where.status = status;
  }

  return await context.prisma.slotBooking.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      services: true,
      vehicles: true,
    },
  });
},

estimations: async (_: any, __: any, context: Context) => {
  const centerId = requireCenterId(context);
  
  return await context.prisma.estimation.findMany({
    where: { centerId }, // ← Filter by centerId
    include: { items: true, center: true },
    orderBy: { createdAt: 'desc' }
  });
},
*/

// STEP 4: Key Mutation Updates (auto-assign centerId on creation):

/*
createPricing: async (_: any, { input }: any, context: Context) => {
  requireAdmin(context);
  const centerId = requireCenterId(context);
  
  return await context.prisma.pricing.create({
    data: {
      ...input,
      centerId,  // ← Auto-assign centerId
    },
  });
},

updatePricing: async (_: any, { id, input }: any, context: Context) => {
  requireAdmin(context);
  const centerId = requireCenterId(context);
  
  // Verify pricing belongs to user's center
  const pricing = await context.prisma.pricing.findUnique({
    where: { id },
    select: { centerId: true }
  });
  
  if (!pricing) throw new Error('Pricing not found');
  requireOwnCenter(context, pricing.centerId);
  
  return await context.prisma.pricing.update({
    where: { id },
    data: input,
  });
},

deletePricing: async (_: any, { id }: any, context: Context) => {
  requireAdmin(context);
  const centerId = requireCenterId(context);
  
  // Verify pricing belongs to user's center
  const pricing = await context.prisma.pricing.findUnique({
    where: { id },
    select: { centerId: true }
  });
  
  if (!pricing) throw new Error('Pricing not found');
  requireOwnCenter(context, pricing.centerId);
  
  return await context.prisma.pricing.delete({
    where: { id },
  });
},

createWorker: async (_: any, { input }: any, context: Context) => {
  requireAdmin(context);
  const centerId = requireCenterId(context);
  
  // ... validation code ...
  
  const user = await context.prisma.user.create({
    data: {
      ...input,
      role: UserRole.WORKER,
      centerId,  // ← Auto-assign centerId
      // ... other fields
    },
  });
  
  return user;
},

createEstimation: async (_: any, { input }: any, context: Context) => {
  requireAuth(context);
  const centerId = requireCenterId(context);
  
  // ... estimation logic ...
  
  const estimation = await context.prisma.estimation.create({
    data: {
      ...estimationData,
      centerId,  // ← Auto-assign centerId
      items: {
        create: input.items
      }
    },
    include: { items: true, center: true }
  });
  
  return estimation;
},
*/

// STEP 5: Customer-facing queries (don't filter by centerId - customers can use any center):

/*
myVehicles: async (_: any, __: any, context: Context) => {
  requireAuth(context);
  
  return await context.prisma.vehicle.findMany({
    where: { customerId: context.user!.id },
    // Don't filter by centerId - customers can use multiple centers
    include: {
      worker: true,
      payment: true,
      pricing: true,
      center: true,  // Include center info so customer knows which center
    },
    orderBy: { createdAt: 'desc' },
  });
},

myBookings: async (_: any, __: any, context: Context) => {
  requireAuth(context);
  
  return await context.prisma.slotBooking.findMany({
    where: { customerMobile: context.user!.mobile },
    // Don't filter by centerId - customer can book at multiple centers
    include: {
      services: true,
      vehicles: true,
      center: true,  // Include center info
    },
    orderBy: { createdAt: 'desc' },
  });
},
*/

// STEP 6: Super Admin Queries (can see all centers):

/*
allCenters: async (_: any, __: any, context: Context) => {
  if (!isSuperAdmin(context)) {
    throw new Error('Access denied: Super admin only');
  }
  
  return await context.prisma.center.findMany({
    include: {
      _count: {
        select: {
          users: true,
          vehicles: true,
          slotBookings: true,
          pricing: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
},

centerStats: async (_: any, { centerId }: any, context: Context) => {
  if (!isSuperAdmin(context)) {
    throw new Error('Access denied: Super admin only');
  }
  
  const [totalVehicles, totalBookings, smsUsage] = await Promise.all([
    context.prisma.vehicle.count({ where: { centerId } }),
    context.prisma.slotBooking.count({ where: { centerId } }),
    context.prisma.center.findUnique({
      where: { id: centerId },
      select: { totalSmsUsed: true, smsCredits: true }
    })
  ]);
  
  return {
    centerId,
    totalVehicles,
    totalBookings,
    smsUsed: smsUsage?.totalSmsUsed || 0,
    smsRemaining: smsUsage?.smsCredits || 0,
  };
},
*/

export {};
