/**
 * Multi-Tenant Center Isolation Middleware
 * Ensures data segregation between different wash centers
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Context {
  user?: {
    id: string;
    mobile: string;
    role: string;
    name?: string;
    centerId?: string;
  };
  centerId?: string;
  prisma: PrismaClient;
}

/**
 * Require that user has a centerId (for ADMIN/WORKER operations)
 * Falls back to first available center during migration
 * @throws Error if no centerId found and no centers exist
 */
export const requireCenterId = async (context: Context): Promise<string> => {
  // Super admin can access all centers (don't enforce)
  if (context.user?.role === 'SUPER_ADMIN') {
    return context.centerId || '';
  }

  let centerId = context.user?.centerId || context.centerId;
  
  // Fallback during migration: use first available center
  if (!centerId && (context.user?.role === 'ADMIN' || context.user?.role === 'WORKER')) {
    const defaultCenter = await context.prisma.center.findFirst({
      orderBy: { createdAt: 'asc' }
    });
    
    if (defaultCenter) {
      console.warn(`⚠️ User ${context.user?.id} has no centerId, using default center ${defaultCenter.id}`);
      centerId = defaultCenter.id;
      
      // Update user with centerId for next time
      if (context.user?.id) {
        await context.prisma.user.update({
          where: { id: context.user.id },
          data: { centerId: defaultCenter.id }
        }).catch(err => console.error('Failed to update user centerId:', err));
      }
    }
  }
  
  if (!centerId) {
    throw new Error('Access denied: No center association found. Please contact administrator.');
  }
  
  return centerId;
};

/**
 * Verify that user can only access their own center's data
 * @throws Error if trying to access another center's resource
 */
export const requireOwnCenter = async (context: Context, resourceCenterId: string): Promise<void> => {
  // Super admin can access all centers
  if (context.user?.role === 'SUPER_ADMIN') {
    return;
  }

  const userCenterId = await requireCenterId(context);
  
  if (userCenterId !== resourceCenterId) {
    throw new Error('Access denied: Cannot access another center\'s data');
  }
};

/**
 * Get centerId from context, or allow optional for customer operations
 */
export const getCenterIdOptional = (context: Context): string | undefined => {
  if (context.user?.role === 'SUPER_ADMIN') {
    return context.centerId;
  }
  
  return context.user?.centerId || context.centerId;
};

/**
 * Check if user is super admin
 */
export const isSuperAdmin = (context: Context): boolean => {
  return context.user?.role === 'SUPER_ADMIN';
};
