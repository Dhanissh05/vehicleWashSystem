/**
 * Check and auto-cancel slot bookings that have exceeded the timeout
 * Marks them as REJECTED with NO_SHOW reason
 */
export declare function checkAndCancelExpiredSlotBookings(): Promise<{
    cancelled: number;
    bookings: {
        model: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        vehicleNumber: string;
        status: string;
        vehicleType: string;
        carCategory: string | null;
        photoUrl: string | null;
        brand: string | null;
        color: string | null;
        centerId: string;
        verifiedBy: string | null;
        verifiedAt: Date | null;
        customerMobile: string;
        customerName: string | null;
        carWash: boolean;
        twoWheelerWash: boolean;
        bodyRepair: boolean;
        otp: string;
        rejectionReason: string | null;
        cancelledByRole: string | null;
        cancelledByName: string | null;
        cancelledAt: Date | null;
    }[];
}>;
/**
 * Initialize the cron job to run every 30 minutes
 * This checks for expired slot bookings and cancels them automatically
 */
export declare function initSlotBookingCron(): void;
//# sourceMappingURL=slotBooking.service.d.ts.map