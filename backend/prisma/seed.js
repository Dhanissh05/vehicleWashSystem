const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

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
      create: pricing,
    });
  }
  console.log('✅ Pricing created');

  // Create Sample Customer
  const customerPassword = await bcrypt.hash('customer123', 10);
  const customer = await prisma.user.upsert({
    where: { mobile: '9876543211' },
    update: {},
    create: {
      mobile: '9876543211',
      name: 'Sample Customer',
      email: 'customer@vehiclewash.com',
      password: customerPassword,
      role: 'CUSTOMER',
      isActive: true,
    },
  });
  console.log('✅ Sample customer created:', customer.mobile);

  // Create SMS Templates
  const smsTemplates = [
    {
      id: 'otp-template',
      templateId: 'OTP_TEMPLATE',
      content: 'Your Vehicle Wash OTP is: {{otp}}. Valid for 10 minutes.',
    },
    {
      id: 'booking-confirm',
      templateId: 'BOOKING_CONFIRM',
      content: 'Your vehicle {{vehicleNumber}} has been booked for washing. Slot: {{slot}}',
    },
  ];

  for (const template of smsTemplates) {
    await prisma.smsTemplate.upsert({
      where: { id: template.id },
      update: { content: template.content },
      create: template,
    });
  }
  console.log('✅ SMS templates created');

  console.log('✅ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
