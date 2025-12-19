import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { mobile: '9999999999' },
    update: {},
    create: {
      mobile: '9999999999',
      name: 'Admin User',
      email: 'admin@vehiclewash.com',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Admin user created:', admin.mobile);

  // Create Worker Users
  const workerPassword = await bcrypt.hash('worker123', 10);
  const worker1 = await prisma.user.upsert({
    where: { mobile: '9876543210' },
    update: {},
    create: {
      mobile: '9876543210',
      name: 'John Worker',
      email: 'john@vehiclewash.com',
      password: workerPassword,
      role: 'WORKER',
      isActive: true,
    },
  });
  console.log('✅ Worker created:', worker1.mobile);

  // Create Wash Center
  const center = await prisma.center.upsert({
    where: { id: 'default-center' },
    update: {},
    create: {
      id: 'default-center',
      name: 'Main Wash Center',
      address: '123 Main Street, City, State',
      latitude: 19.0760,
      longitude: 72.8777,
      mobile: '9999988888',
      email: 'center@vehiclewash.com',
      dailySlotsTwoWheeler: 10,
      availableSlotsTwoWheeler: 10,
      dailySlotsCar: 10,
      availableSlotsCar: 10,
      isActive: true,
    },
  });
  console.log('✅ Wash center created:', center.name);

  // Create Pricing
  const pricingData = [
    { id: 'pricing-two-wheeler', vehicleType: 'TWO_WHEELER', carCategory: null, price: 100, description: 'Two Wheeler Wash' },
    { id: 'pricing-hatchback', vehicleType: 'CAR', carCategory: 'HATCHBACK', price: 300, description: 'Hatchback Wash' },
    { id: 'pricing-sedan', vehicleType: 'CAR', carCategory: 'SEDAN', price: 400, description: 'Sedan Wash' },
    { id: 'pricing-suv', vehicleType: 'CAR', carCategory: 'SUV', price: 500, description: 'SUV Wash' },
    { id: 'pricing-hybrid', vehicleType: 'CAR', carCategory: 'HYBRID', price: 450, description: 'Hybrid Wash' },
  ];

  for (const pricing of pricingData) {
    await prisma.pricing.upsert({
      where: { id: pricing.id },
      update: { price: pricing.price },
      create: pricing as any,
    });
  }
  console.log('✅ Pricing created');

  // Create Sample Customer
  const customer = await prisma.user.upsert({
    where: { mobile: '9123456780' },
    update: {},
    create: {
      mobile: '9123456780',
      name: 'Sample Customer',
      email: 'customer@example.com',
      role: 'CUSTOMER',
      isActive: true,
    },
  });
  console.log('✅ Sample customer created:', customer.mobile);

  // Create SMS Templates
  const smsTemplates = [
    {
      key: 'VEHICLE_RECEIVED',
      template: 'Hi {CUSTOMER_NAME}, your vehicle {VEHICLE_NUMBER} was received at {SHOP_NAME} on {TIMESTAMP}. Track progress: {PLAY_STORE_LINK}',
      isActive: true,
    },
    {
      key: 'VEHICLE_READY',
      template: 'Hi {CUSTOMER_NAME}, your vehicle {VEHICLE_NUMBER} is ready for pickup at {SHOP_NAME}. Payment: ₹{AMOUNT}. {PAYMENT_LINK}',
      isActive: true,
    },
    {
      key: 'PAYMENT_SUCCESS',
      template: 'Payment Successful! Hi {CUSTOMER_NAME}, we received ₹{AMOUNT} for {VEHICLE_NUMBER} via {PAYMENT_METHOD}. Thank you!',
      isActive: true,
    },
    {
      key: 'WORKER_CREDENTIALS',
      template: 'Welcome to {SHOP_NAME}! Your worker account: Mobile: {MOBILE}, Password: {PASSWORD}, Worker Code: {WORKER_CODE}. Download: {PLAY_STORE_LINK}',
      isActive: true,
    },
  ];

  for (const template of smsTemplates) {
    await prisma.smsTemplate.upsert({
      where: { key: template.key },
      update: {},
      create: template,
    });
  }
  console.log('✅ SMS templates created');

  // Create System Config
  await prisma.systemConfig.upsert({
    where: { key: 'PLAY_STORE_URL' },
    update: {},
    create: {
      key: 'PLAY_STORE_URL',
      value: 'https://play.google.com/store/apps/details?id=com.vehiclewash.customer',
      description: 'Customer app Play Store URL',
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'ENABLE_SLOT_BOOKING' },
    update: {},
    create: {
      key: 'ENABLE_SLOT_BOOKING',
      value: 'false',
      description: 'Enable slot booking feature',
    },
  });
  console.log('✅ System config created');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
