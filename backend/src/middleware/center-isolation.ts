/**
 * Multi-Tenant Center Isolation Middleware
 * Ensures data segregation between different wash centers
 */

interface Context {
  user?: {
    id: string;
    mobile: string;
    role: string;
    name?: string;
    centerId?: string;
  };
  centerId?: string;
}

/**
 * Require that user has a centerId (for ADMIN/WORKER operations)
 * @throws Error if no centerId found
 */
export const requireCenterId = (context: Context): string => {
  // Super admin can access all centers (don't enforce)
  if (context.user?.role === 'SUPER_ADMIN') {
    return context.centerId || '';
  }

  const centerId = context.user?.centerId || context.centerId;
  
  if (!centerId) {
    throw new Error('Access denied: No center association found. Please contact administrator.');
  }
  
  return centerId;
};

/**
 * Verify that user can only access their own center's data
 * @throws Error if trying to access another center's resource
 */
export const requireOwnCenter = (context: Context, resourceCenterId: string): void => {
  // Super admin can access all centers
  if (context.user?.role === 'SUPER_ADMIN') {
    return;
  }

  const userCenterId = requireCenterId(context);
  
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
