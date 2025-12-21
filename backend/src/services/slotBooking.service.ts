import cron from 'node-cron';
import prisma from '../lib/prisma';

// Configuration: Auto-cancel timeout in hours (default 2 hours)
const AUTO_CANCEL_TIMEOUT_HOURS = parseInt(process.env.SLOT_AUTO_CANCEL_HOURS || '2');

/**
 * Check and auto-cancel slot bookings that have exceeded the timeout
 * Marks them as REJECTED with NO_SHOW reason
 */
export async function checkAndCancelExpiredSlotBookings() {
  try {
    const timeoutDate = new Date();
    timeoutDate.setHours(timeoutDate.getHours() - AUTO_CANCEL_TIMEOUT_HOURS);

    console.log(`[Slot Auto-Cancel] Checking for bookings older than ${AUTO_CANCEL_TIMEOUT_HOURS} hours (before ${timeoutDate.toISOString()})`);

    // Find all PENDING slot bookings that are older than the timeout
    const expiredBookings = await prisma.slotBooking.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: timeoutDate, // Less than (older than) timeout date
        },
      },
      include: {
        center: true,
      },
    });

    if (expiredBookings.length === 0) {
      console.log('[Slot Auto-Cancel] No expired bookings found');
      return { cancelled: 0, bookings: [] };
    }

    console.log(`[Slot Auto-Cancel] Found ${expiredBookings.length} expired booking(s)`);

    const cancelledBookings = [];

    for (const booking of expiredBookings) {
      // Update booking status to REJECTED with NO_SHOW reason
      const updated = await prisma.slotBooking.update({
        where: { id: booking.id },
        data: {
          status: 'REJECTED',
          rejectionReason: 'NO_SHOW',
          updatedAt: new Date(),
        },
      });

      // Restore slot availability (ensure it doesn't exceed daily limit)
      const slotField =
        booking.vehicleType === 'TWO_WHEELER'
          ? 'availableSlotsTwoWheeler'
          : 'availableSlotsCar';
      
      const dailySlotField =
        booking.vehicleType === 'TWO_WHEELER'
          ? 'dailySlotsTwoWheeler'
          : 'dailySlotsCar';

      // Get current center data
      const center = await prisma.center.findUnique({
        where: { id: booking.centerId },
      });

      if (center) {
        const currentAvailable = center[slotField];
        const dailyLimit = center[dailySlotField];
        
        // Only increment if we haven't reached the daily limit
        if (currentAvailable < dailyLimit) {
          await prisma.center.update({
            where: { id: booking.centerId },
            data: {
              [slotField]: {
                increment: 1,
              },
            },
          });
        } else {
          console.log(
            `[Slot Auto-Cancel] Skipping slot restoration - already at daily limit (${currentAvailable}/${dailyLimit})`
          );
        }
      }

      console.log(
        `[Slot Auto-Cancel] Cancelled booking ${booking.id} - ${booking.vehicleNumber} (Customer: ${booking.customerMobile}) - NO_SHOW`
      );

      cancelledBookings.push(updated);
    }

    return {
      cancelled: cancelledBookings.length,
      bookings: cancelledBookings,
    };
  } catch (error) {
    console.error('[Slot Auto-Cancel] Error checking expired bookings:', error);
    throw error;
  }
}

/**
 * Initialize the cron job to run every 30 minutes
 * This checks for expired slot bookings and cancels them automatically
 */
export function initSlotBookingCron() {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('[Slot Auto-Cancel Cron] Running scheduled check...');
    try {
      await checkAndCancelExpiredSlotBookings();
    } catch (error) {
      console.error('[Slot Auto-Cancel Cron] Error:', error);
    }
  });

  console.log(
    `[Slot Auto-Cancel] Cron job initialized - will check every 30 minutes for bookings older than ${AUTO_CANCEL_TIMEOUT_HOURS} hours`
  );

  // Also run immediately on startup
  setTimeout(async () => {
    console.log('[Slot Auto-Cancel] Running initial check on startup...');
    try {
      await checkAndCancelExpiredSlotBookings();
    } catch (error) {
      console.error('[Slot Auto-Cancel] Initial check error:', error);
    }
  }, 5000); // Wait 5 seconds after startup
}
