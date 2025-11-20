import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { PaymentStatus } from '../types/enums';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Razorpay webhook
router.post('/razorpay', async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const signature = req.headers['x-razorpay-signature'] as string;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { event, payload } = req.body;

    if (event === 'payment.captured') {
      const { order_id, id: payment_id, amount } = payload.payment.entity;

      // Find payment by order ID
      const payment = await prisma.payment.findFirst({
        where: { razorpayOrderId: order_id },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            razorpayPaymentId: payment_id,
            transactionId: payment_id,
          },
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Instamojo webhook
router.post('/instamojo', async (req, res) => {
  try {
    const { payment_id, status, amount, buyer_phone } = req.body;

    if (status === 'Credit') {
      // Find payment by Instamojo payment ID
      const payment = await prisma.payment.findFirst({
        where: { instamojoPaymentId: payment_id },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            transactionId: payment_id,
          },
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Instamojo webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export { router as webhookRouter };
