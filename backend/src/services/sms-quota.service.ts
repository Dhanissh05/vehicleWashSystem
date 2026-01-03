/**
 * Multi-Tenant SMS Service with Center Quota Tracking
 * 
 * Tracks SMS usage per center and enforces credit limits
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SmsResult {
  success: boolean;
  message?: string;
  error?: string;
  creditsRemaining?: number;
}

/**
 * Send SMS with center quota tracking
 * 
 * @param centerId - The center ID for quota tracking
 * @param mobile - Recipient mobile number
 * @param message - SMS content
 * @param vehicleId - Optional vehicle ID for tracking
 * @param bookingId - Optional booking ID for tracking
 * @returns SmsResult with success status and remaining credits
 */
export async function sendSmsWithQuota(
  centerId: string,
  mobile: string,
  message: string,
  vehicleId?: string,
  bookingId?: string
): Promise<SmsResult> {
  try {
    // Check if center has credits
    const center = await prisma.center.findUnique({
      where: { id: centerId },
      select: { 
        smsCredits: true, 
        name: true,
        smsCreditExpiry: true 
      }
    });

    if (!center) {
      throw new Error('Center not found');
    }

    // Check if credits expired
    if (center.smsCreditExpiry && new Date() > center.smsCreditExpiry) {
      await logSms(centerId, mobile, message, 'failed', 0, vehicleId, bookingId);
      return {
        success: false,
        error: `SMS credits expired for ${center.name}. Please renew.`,
        creditsRemaining: center.smsCredits
      };
    }

    if (center.smsCredits < 1) {
      await logSms(centerId, mobile, message, 'failed', 0, vehicleId, bookingId);
      return {
        success: false,
        error: `SMS credits exhausted for ${center.name}. Please recharge.`,
        creditsRemaining: 0
      };
    }

    // Send SMS via provider (Fast2SMS, MSG91, Twilio, etc.)
    const smsResult = await sendViaSmsProvider(mobile, message);

    if (smsResult.success) {
      // Deduct credit and log
      await prisma.$transaction([
        prisma.center.update({
          where: { id: centerId },
          data: {
            smsCredits: { decrement: 1 },
            totalSmsUsed: { increment: 1 }
          }
        }),
        prisma.smsLog.create({
          data: {
            centerId,
            mobile,
            message,
            status: 'sent',
            creditsUsed: 1,
            vehicleId,
            bookingId
          }
        })
      ]);

      return {
        success: true,
        message: 'SMS sent successfully',
        creditsRemaining: center.smsCredits - 1
      };
    } else {
      // Log failed attempt (don't deduct credit)
      await logSms(centerId, mobile, message, 'failed', 0, vehicleId, bookingId);
      return {
        success: false,
        error: smsResult.error || 'Failed to send SMS',
        creditsRemaining: center.smsCredits
      };
    }
  } catch (error: any) {
    console.error('SMS sending error:', error);
    await logSms(centerId, mobile, message, 'failed', 0, vehicleId, bookingId);
    return {
      success: false,
      error: error.message || 'SMS service error',
      creditsRemaining: 0
    };
  }
}

/**
 * Log SMS attempt (success or failure)
 */
async function logSms(
  centerId: string,
  mobile: string,
  message: string,
  status: string,
  creditsUsed: number,
  vehicleId?: string,
  bookingId?: string
) {
  try {
    await prisma.smsLog.create({
      data: {
        centerId,
        mobile,
        message,
        status,
        creditsUsed,
        vehicleId,
        bookingId
      }
    });
  } catch (error) {
    console.error('Failed to log SMS:', error);
  }
}

/**
 * Send SMS via actual provider (Fast2SMS, MSG91, Twilio, etc.)
 * Replace this with your actual SMS provider integration
 */
async function sendViaSmsProvider(
  mobile: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Example using Fast2SMS
    const apiKey = process.env.FAST2SMS_API_KEY;
    
    if (!apiKey) {
      console.warn('FAST2SMS_API_KEY not configured, simulating SMS send');
      return { success: true }; // Simulate success in development
    }

    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'v3',
        sender_id: 'TXTIND',
        message: message,
        language: 'english',
        flash: 0,
        numbers: mobile
      })
    });

    const result = await response.json();

    if (result.return === true) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: result.message || 'SMS provider error' 
      };
    }
  } catch (error: any) {
    console.error('SMS provider error:', error);
    return { 
      success: false, 
      error: error.message || 'Network error' 
    };
  }
}

/**
 * Add SMS credits to a center (Admin function)
 * 
 * @param centerId - Center ID
 * @param credits - Number of credits to add
 * @param expiryDays - Days until credits expire (default 90)
 */
export async function addSmsCredits(
  centerId: string,
  credits: number,
  expiryDays: number = 90
): Promise<{ success: boolean; newBalance: number }> {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);

  const updatedCenter = await prisma.center.update({
    where: { id: centerId },
    data: {
      smsCredits: { increment: credits },
      smsCreditExpiry: expiryDate
    },
    select: { smsCredits: true, name: true }
  });

  console.log(`✅ Added ${credits} SMS credits to ${updatedCenter.name}`);
  console.log(`   New balance: ${updatedCenter.smsCredits} credits`);
  console.log(`   Expires: ${expiryDate.toDateString()}`);

  return {
    success: true,
    newBalance: updatedCenter.smsCredits
  };
}

/**
 * Get SMS usage statistics for a center
 */
export async function getSmsStats(centerId: string) {
  const [center, recentLogs, todayUsage] = await Promise.all([
    prisma.center.findUnique({
      where: { id: centerId },
      select: {
        name: true,
        smsCredits: true,
        totalSmsUsed: true,
        smsCreditExpiry: true
      }
    }),
    prisma.smsLog.findMany({
      where: { centerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        mobile: true,
        status: true,
        creditsUsed: true,
        createdAt: true
      }
    }),
    prisma.smsLog.aggregate({
      where: {
        centerId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        },
        status: 'sent'
      },
      _sum: { creditsUsed: true }
    })
  ]);

  return {
    center: center?.name,
    creditsRemaining: center?.smsCredits || 0,
    totalUsed: center?.totalSmsUsed || 0,
    todayUsed: todayUsage._sum.creditsUsed || 0,
    expiryDate: center?.smsCreditExpiry,
    recentActivity: recentLogs
  };
}

/**
 * Check if center has enough credits before sending batch SMS
 */
export async function checkSmsQuota(
  centerId: string,
  requiredCredits: number
): Promise<{ hasEnough: boolean; available: number }> {
  const center = await prisma.center.findUnique({
    where: { id: centerId },
    select: { smsCredits: true }
  });

  const available = center?.smsCredits || 0;

  return {
    hasEnough: available >= requiredCredits,
    available
  };
}
