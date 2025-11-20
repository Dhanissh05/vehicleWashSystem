/**
 * Enums for the Vehicle Wash System
 * 
 * Since SQLite doesn't support native enums, we define them here as TypeScript enums
 * and use them throughout the application for type safety.
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  WORKER = 'WORKER',
  CUSTOMER = 'CUSTOMER',
}

export enum VehicleType {
  CAR = 'CAR',
  TWO_WHEELER = 'TWO_WHEELER',
}

export enum CarCategory {
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  HATCHBACK = 'HATCHBACK',
  HYBRID = 'HYBRID',
}

export enum ServiceType {
  WASH = 'WASH',
  BODY_REPAIR = 'BODY_REPAIR',
}

export enum VehicleStatus {
  RECEIVED = 'RECEIVED',
  WASHING = 'WASHING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  DELIVERED = 'DELIVERED',
  // Body Repair Statuses
  BODY_REPAIR_ASSESSMENT = 'BODY_REPAIR_ASSESSMENT',
  BODY_REPAIR_IN_PROGRESS = 'BODY_REPAIR_IN_PROGRESS',
  BODY_REPAIR_PAINTING = 'BODY_REPAIR_PAINTING',
  BODY_REPAIR_COMPLETE = 'BODY_REPAIR_COMPLETE',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  MANUAL_PENDING = 'MANUAL_PENDING',
  REJECTED = 'REJECTED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  RAZORPAY = 'RAZORPAY',
  INSTAMOJO = 'INSTAMOJO',
  MANUAL_UPI = 'MANUAL_UPI',
  MANUAL_GPAY = 'MANUAL_GPAY',
  CASH = 'CASH',
}
