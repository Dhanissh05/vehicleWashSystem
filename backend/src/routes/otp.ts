import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendOtpSms } from '../services/sms.service';

const router = Router();
const prisma = new PrismaClient();

// Send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile || mobile.length < 10) {
      return res.status(400).json({ error: 'Invalid mobile number' });
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.otpCode.create({
      data: {
        mobile,
        code,
        expiresAt,
      },
    });

    // Send OTP via Fast2SMS
    const smsSent = await sendOtpSms(mobile, code);

    console.log(`📱 OTP for ${mobile}: ${code} (SMS sent: ${smsSent})`);

    res.json({ 
      success: true, 
      message: 'OTP sent successfully',
      debug: process.env.NODE_ENV === 'development' ? { code } : undefined
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { mobile, code } = req.body;

    if (!mobile || !code) {
      return res.status(400).json({ error: 'Mobile and code are required' });
    }

    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        mobile,
        code,
        verified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP as verified
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

export { router as otpRouter };
