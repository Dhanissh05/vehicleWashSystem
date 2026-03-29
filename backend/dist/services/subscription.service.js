"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSubscriptionCron = exports.runPaymentReminders = exports.runSubscriptionStatusTransitions = exports.sendSubscriptionReminder = exports.settleSubscriptionInvoice = exports.applyPlanToCompany = exports.issueInvoiceForSubscription = exports.buildInvoiceNumber = exports.enforceSubscriptionAccess = exports.getEffectiveSubscriptionStatus = exports.getCurrentSubscription = exports.getBillingCycleDays = void 0;
const node_cron_1 = require("node-cron");
const fcm_service_1 = require("./fcm.service");
function getBillingCycleDays(plan) {
    if (!plan)
        return null;
    if (typeof plan.validityDays === 'number')
        return plan.validityDays;
    if (plan.billingCycle === 'MONTHLY')
        return 30;
    if (plan.billingCycle === 'YEARLY')
        return 365;
    return null;
}
exports.getBillingCycleDays = getBillingCycleDays;
function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}
function startOfDay(date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
}
function endOfDay(date) {
    const value = new Date(date);
    value.setHours(23, 59, 59, 999);
    return value;
}
function diffInDays(a, b) {
    const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
    return Math.floor(ms / 86400000);
}
async function getCurrentSubscription(prisma, centerId) {
    return prisma.companySubscription.findFirst({
        where: { centerId },
        include: {
            plan: true,
            center: true,
            invoices: {
                orderBy: { createdAt: 'desc' },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}
exports.getCurrentSubscription = getCurrentSubscription;
async function getEffectiveSubscriptionStatus(prisma, centerId) {
    const center = await prisma.center.findUnique({
        where: { id: centerId },
        select: { id: true, status: true, isActive: true },
    });
    if (!center || !center.isActive || center.status === 'LOCKED' || center.status === 'REMOVED') {
        return { status: 'LOCKED', subscription: null, plan: null };
    }
    const subscription = await getCurrentSubscription(prisma, centerId);
    if (!subscription) {
        return { status: 'ACTIVE', subscription: null, plan: null };
    }
    if (subscription.lockedByAdmin) {
        return { status: 'LOCKED', subscription, plan: subscription.plan };
    }
    if (subscription.plan?.billingCycle === 'LIFETIME') {
        return { status: 'ACTIVE', subscription, plan: subscription.plan };
    }
    if (!subscription.nextDueDate) {
        return { status: subscription.status || 'ACTIVE', subscription, plan: subscription.plan };
    }
    const now = new Date();
    if (now <= subscription.nextDueDate) {
        return { status: 'ACTIVE', subscription, plan: subscription.plan };
    }
    const expiryDate = addDays(subscription.nextDueDate, subscription.gracePeriodDays || 0);
    if (now <= expiryDate) {
        return { status: 'OVERDUE', subscription, plan: subscription.plan };
    }
    return { status: 'EXPIRED', subscription, plan: subscription.plan };
}
exports.getEffectiveSubscriptionStatus = getEffectiveSubscriptionStatus;
async function enforceSubscriptionAccess(prisma, centerId, operationName) {
    const resolved = await getEffectiveSubscriptionStatus(prisma, centerId);
    if (resolved.status === 'EXPIRED' || resolved.status === 'LOCKED') {
        throw new Error(`Your plan has expired. Please make a payment to continue using services. (${operationName})`);
    }
    return resolved;
}
exports.enforceSubscriptionAccess = enforceSubscriptionAccess;
function buildInvoiceNumber() {
    const now = new Date();
    const parts = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `INV-${parts}-${random}`;
}
exports.buildInvoiceNumber = buildInvoiceNumber;
async function issueInvoiceForSubscription(prisma, subscription, plan, baseDate) {
    if (!plan || plan.billingCycle === 'LIFETIME') {
        return null;
    }
    const days = getBillingCycleDays(plan) || 30;
    const periodStart = baseDate ? new Date(baseDate) : new Date(subscription.startDate || new Date());
    const dueDate = new Date(subscription.nextDueDate || addDays(periodStart, days));
    const periodEnd = new Date(dueDate);
    const existing = await prisma.invoice.findFirst({
        where: {
            subscriptionId: subscription.id,
            status: { in: ['PENDING', 'OVERDUE'] },
            dueDate,
        },
    });
    if (existing) {
        return existing;
    }
    return prisma.invoice.create({
        data: {
            centerId: subscription.centerId,
            subscriptionId: subscription.id,
            invoiceNumber: buildInvoiceNumber(),
            planName: plan.planName,
            amount: plan.price,
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd,
            dueDate,
            issuedAt: new Date(),
            status: 'PENDING',
        },
    });
}
exports.issueInvoiceForSubscription = issueInvoiceForSubscription;
async function applyPlanToCompany(prisma, centerId, planId) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
        throw new Error('Subscription plan not found or inactive');
    }
    const current = await getCurrentSubscription(prisma, centerId);
    const now = new Date();
    if (current?.plan?.billingCycle === 'YEARLY' && plan.billingCycle === 'MONTHLY' && current.nextDueDate && current.nextDueDate > now) {
        throw new Error('Yearly plan can only be changed to monthly after the current cycle ends');
    }
    const nextDueDate = plan.billingCycle === 'LIFETIME' ? null : addDays(now, getBillingCycleDays(plan) || 30);
    let subscription;
    if (current) {
        subscription = await prisma.companySubscription.update({
            where: { id: current.id },
            data: {
                previousPlanId: current.planId,
                previousStatus: current.status,
                planId: plan.id,
                startDate: now,
                nextDueDate,
                gracePeriodDays: plan.gracePeriodDays,
                status: 'ACTIVE',
                lockedByAdmin: false,
            },
            include: { plan: true, center: true, invoices: true },
        });
    }
    else {
        subscription = await prisma.companySubscription.create({
            data: {
                centerId,
                planId: plan.id,
                startDate: now,
                nextDueDate,
                gracePeriodDays: plan.gracePeriodDays,
                status: 'ACTIVE',
                lockedByAdmin: false,
            },
            include: { plan: true, center: true, invoices: true },
        });
    }
    if (plan.billingCycle !== 'LIFETIME') {
        await issueInvoiceForSubscription(prisma, subscription, plan, now);
    }
    return prisma.companySubscription.findUnique({
        where: { id: subscription.id },
        include: { plan: true, center: true, invoices: { orderBy: { createdAt: 'desc' } } },
    });
}
exports.applyPlanToCompany = applyPlanToCompany;
async function settleSubscriptionInvoice(prisma, invoiceId, paymentMethod, paymentNotes) {
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
            subscription: { include: { plan: true } },
            center: true,
        },
    });
    if (!invoice) {
        throw new Error('Invoice not found');
    }
    if (invoice.status === 'PAID') {
        return invoice;
    }
    const paidInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
            status: 'PAID',
            paidAt: new Date(),
            paymentMethod: paymentMethod || invoice.paymentMethod || 'MANUAL',
            paymentNotes: paymentNotes || invoice.paymentNotes || null,
        },
        include: {
            subscription: { include: { plan: true } },
            center: true,
        },
    });
    const plan = paidInvoice.subscription.plan;
    let nextDueDate = null;
    if (plan?.billingCycle !== 'LIFETIME') {
        nextDueDate = addDays(new Date(), getBillingCycleDays(plan) || 30);
    }
    const updatedSubscription = await prisma.companySubscription.update({
        where: { id: paidInvoice.subscriptionId },
        data: {
            status: 'ACTIVE',
            lockedByAdmin: false,
            gracePeriodDays: plan?.gracePeriodDays || paidInvoice.subscription.gracePeriodDays,
            ...(plan?.billingCycle === 'LIFETIME' ? { nextDueDate: null } : { nextDueDate }),
        },
        include: { plan: true },
    });
    if (plan && plan.billingCycle !== 'LIFETIME') {
        await issueInvoiceForSubscription(prisma, updatedSubscription, plan, new Date());
    }
    return paidInvoice;
}
exports.settleSubscriptionInvoice = settleSubscriptionInvoice;
function getReminderText(type, dueDate) {
    const formatted = dueDate ? new Date(dueDate).toLocaleDateString('en-IN') : 'N/A';
    if (type === 'BEFORE_DUE') {
        return `Your subscription is due on ${formatted}. Please complete payment to avoid service interruption.`;
    }
    if (type === 'ON_DUE') {
        return 'Your subscription is due today. Please make payment to continue uninterrupted service.';
    }
    if (type === 'AFTER_DUE') {
        return 'Your subscription is overdue. Please make payment immediately to avoid service suspension.';
    }
    return 'Your subscription has expired. Services are restricted until payment is completed.';
}
async function sendSubscriptionReminder(prisma, subscription, type, customMessage) {
    const admins = await prisma.user.findMany({
        where: {
            centerId: subscription.centerId,
            role: 'ADMIN',
            isActive: true,
        },
        select: {
            id: true,
            mobile: true,
            fcmToken: true,
        },
    });
    const message = customMessage || getReminderText(type, subscription.nextDueDate);
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const existing = await prisma.reminderLog.findFirst({
        where: {
            centerId: subscription.centerId,
            type,
            sentAt: { gte: todayStart, lte: todayEnd },
        },
    });
    if (existing && !customMessage) {
        return false;
    }
    for (const admin of admins) {
        let success = true;
        if (admin.fcmToken) {
            success = await (0, fcm_service_1.sendPushNotification)(admin.fcmToken, {
                title: 'Subscription Reminder',
                body: message,
                data: {
                    type: 'SUBSCRIPTION_REMINDER',
                    reminderType: type,
                    centerId: subscription.centerId,
                },
            });
        }
        await prisma.reminderLog.create({
            data: {
                centerId: subscription.centerId,
                type,
                channel: admin.fcmToken ? 'FCM' : 'SYSTEM',
                recipient: admin.mobile,
                message,
                success,
                ...(success ? {} : { errorMsg: 'FCM delivery failed' }),
            },
        });
    }
    return true;
}
exports.sendSubscriptionReminder = sendSubscriptionReminder;
async function runSubscriptionStatusTransitions(prisma) {
    const subscriptions = await prisma.companySubscription.findMany({
        include: { plan: true, center: true },
    });
    const now = new Date();
    for (const subscription of subscriptions) {
        let status = subscription.status;
        if (subscription.lockedByAdmin || subscription.center?.status === 'LOCKED') {
            status = 'LOCKED';
        }
        else if (subscription.plan?.billingCycle === 'LIFETIME') {
            status = 'ACTIVE';
        }
        else if (!subscription.nextDueDate || now <= subscription.nextDueDate) {
            status = 'ACTIVE';
        }
        else {
            const expiryDate = addDays(subscription.nextDueDate, subscription.gracePeriodDays || 0);
            status = now <= expiryDate ? 'OVERDUE' : 'EXPIRED';
        }
        if (status !== subscription.status) {
            await prisma.companySubscription.update({
                where: { id: subscription.id },
                data: { status },
            });
        }
        if (status === 'OVERDUE') {
            await prisma.invoice.updateMany({
                where: { subscriptionId: subscription.id, status: 'PENDING' },
                data: { status: 'OVERDUE' },
            });
        }
    }
}
exports.runSubscriptionStatusTransitions = runSubscriptionStatusTransitions;
async function runPaymentReminders(prisma) {
    const subscriptions = await prisma.companySubscription.findMany({
        include: { plan: true },
    });
    const now = new Date();
    for (const subscription of subscriptions) {
        if (!subscription.nextDueDate || subscription.plan?.billingCycle === 'LIFETIME') {
            continue;
        }
        const due = new Date(subscription.nextDueDate);
        const delta = diffInDays(due, now);
        if (delta === 3) {
            await sendSubscriptionReminder(prisma, subscription, 'BEFORE_DUE');
            continue;
        }
        if (delta === 0) {
            await sendSubscriptionReminder(prisma, subscription, 'ON_DUE');
            continue;
        }
        if (delta < 0 && subscription.status === 'OVERDUE') {
            await sendSubscriptionReminder(prisma, subscription, 'AFTER_DUE');
            continue;
        }
        if (subscription.status === 'EXPIRED') {
            await sendSubscriptionReminder(prisma, subscription, 'AFTER_EXPIRY');
        }
    }
}
exports.runPaymentReminders = runPaymentReminders;
function initSubscriptionCron(prisma) {
    console.log('[Subscription Cron] Cron job initialized — status transitions every hour, reminders daily at 9 AM');
    node_cron_1.schedule('0 * * * *', async () => {
        console.log('[Subscription Cron] Running status transitions at', new Date().toISOString());
        try {
            await runSubscriptionStatusTransitions(prisma);
        }
        catch (error) {
            console.error('[Subscription Cron] Status transition error:', error);
        }
    });
    node_cron_1.schedule('0 9 * * *', async () => {
        console.log('[Subscription Cron] Running reminder job at', new Date().toISOString());
        try {
            await runPaymentReminders(prisma);
        }
        catch (error) {
            console.error('[Subscription Cron] Reminder error:', error);
        }
    });
    setTimeout(async () => {
        console.log('[Subscription Cron] Cron initialized — running initial transition check...');
        try {
            await runSubscriptionStatusTransitions(prisma);
        }
        catch (error) {
            console.error('[Subscription Cron] Initial transition error:', error);
        }
    }, 3000);
}
exports.initSubscriptionCron = initSubscriptionCron;