"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const enums_1 = require("../types/enums");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
exports.webhookRouter = router;
const prisma = new client_1.PrismaClient();
// Razorpay webhook
router.post('/razorpay', async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_KEY_SECRET;
        const signature = req.headers['x-razorpay-signature'];
        // Verify signature
        const expectedSignature = crypto_1.default
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
                        status: enums_1.PaymentStatus.PAID,
                        razorpayPaymentId: payment_id,
                        transactionId: payment_id,
                    },
                });
            }
        }
        res.json({ success: true });
    }
    catch (error) {
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
                        status: enums_1.PaymentStatus.PAID,
                        transactionId: payment_id,
                    },
                });
            }
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Instamojo webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});
//# sourceMappingURL=webhooks.js.map