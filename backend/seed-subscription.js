const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding subscription data...');

  // Create Super Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { mobile: '8888888888' },
    update: {},
    create: {
      mobile: '8888888888',
      name: 'Super Admin',
      email: 'superadmin@vehiclewash.com',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Super Admin created:', superAdmin.mobile);

  // Create Subscription Plans
  const monthlyPlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'plan-monthly-basic' },
    update: {},
    create: {
      id: 'plan-monthly-basic',
      planName: 'Monthly Basic',
      price: 5000,
      billingCycle: 'MONTHLY',
      validityDays: 30,
      gracePeriodDays: 5,
      isActive: true,
    },
  });
  console.log('✅ Monthly Basic Plan created:', monthlyPlan.planName);

  const yearlyPlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'plan-yearly-standard' },
    update: {},
    create: {
      id: 'plan-yearly-standard',
      planName: 'Yearly Standard',
      price: 50000,
      billingCycle: 'YEARLY',
      validityDays: 365,
      gracePeriodDays: 15,
      isActive: true,
    },
  });
  console.log('✅ Yearly Standard Plan created:', yearlyPlan.planName);

  const lifetimePlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'plan-lifetime-premium' },
    update: {},
    create: {
      id: 'plan-lifetime-premium',
      planName: 'Lifetime Premium',
      price: 150000,
      billingCycle: 'LIFETIME',
      validityDays: null,
      gracePeriodDays: 0,
      isActive: true,
    },
  });
  console.log('✅ Lifetime Premium Plan created:', lifetimePlan.planName);

  // Create Test Center/Company with subscription
  const center = await prisma.center.upsert({
    where: { id: 'test-company-1' },
    update: {},
    create: {
      id: 'test-company-1',
      name: 'AquaWash Mumbai',
      address: '456 Marine Drive, Mumbai, Maharashtra',
      latitude: 19.0760,
      longitude: 72.8777,
      mobile: '9876543210',
      email: 'aquawash@vehiclewash.com',
      dailySlotsTwoWheeler: 20,
      availableSlotsTwoWheeler: 20,
      dailySlotsCar: 15,
      availableSlotsCar: 15,
      isActive: true,
      status: 'APPROVED',
    },
  });
  console.log('✅ Test Center created:', center.name);

  // Create Company Subscription
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 10); // Started 10 days ago

  const subscription = await prisma.companySubscription.upsert({
    where: { id: 'sub-test-1' },
    update: {},
    create: {
      centerId: center.id,
      planId: monthlyPlan.id,
      startDate: startDate,
      nextDueDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
      gracePeriodDays: monthlyPlan.gracePeriodDays,
      status: 'ACTIVE',
      lockedByAdmin: false,
    },
  });
  console.log('✅ Company Subscription created:', subscription.id);

  // Create an invoice for the subscription
  const invoiceDate = new Date(now);
  invoiceDate.setDate(invoiceDate.getDate() - 10);

  const invoice = await prisma.invoice.upsert({
    where: { id: 'inv-test-1' },
    update: {},
    create: {
      centerId: center.id,
      subscriptionId: subscription.id,
      invoiceNumber: 'INV-2026-001',
      planName: monthlyPlan.planName,
      amount: monthlyPlan.price,
      billingPeriodStart: invoiceDate,
      billingPeriodEnd: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      issuedAt: invoiceDate,
      status: 'ISSUED',
    },
  });
  console.log('✅ Invoice created:', invoice.invoiceNumber);

  // Create another center for testing
  const center2 = await prisma.center.upsert({
    where: { id: 'test-company-2' },
    update: {},
    create: {
      id: 'test-company-2',
      name: 'QuickWash Delhi',
      address: '789 Connaught Place, New Delhi',
      latitude: 28.6329,
      longitude: 77.1197,
      mobile: '9876543211',
      email: 'quickwash@vehiclewash.com',
      dailySlotsTwoWheeler: 25,
      availableSlotsTwoWheeler: 25,
      dailySlotsCar: 20,
      availableSlotsCar: 20,
      isActive: true,
      status: 'APPROVED',
    },
  });
  console.log('✅ Second Test Center created:', center2.name);

  // Create subscription for second center with YEARLY plan
  const subscription2 = await prisma.companySubscription.upsert({
    where: { id: 'sub-test-2' },
    update: {},
    create: {
      centerId: center2.id,
      planId: yearlyPlan.id,
      startDate: new Date('2025-03-30'),
      nextDueDate: new Date('2026-03-30'),
      gracePeriodDays: yearlyPlan.gracePeriodDays,
      status: 'ACTIVE',
      lockedByAdmin: false,
    },
  });
  console.log('✅ Second Company Subscription created:', subscription2.id);

  console.log('\n✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:',  e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
