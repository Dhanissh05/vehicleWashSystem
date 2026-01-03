/**
 * Migration Script: Add Multi-Tenant Support
 * 
 * This script migrates existing data to support multi-tenant architecture:
 * 1. Creates a default center if none exists
 * 2. Links all existing users (ADMIN/WORKER) to default center
 * 3. Links all existing pricing to default center
 * 4. Verifies all vehicles and bookings are linked to centers
 * 
 * Run this ONCE before deploying multi-tenant changes:
 * npx ts-node backend/migrate-to-multi-tenant.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToMultiTenant() {
  console.log('🚀 Starting Multi-Tenant Migration...\n');

  try {
    // Step 1: Get or create default center
    let defaultCenter = await prisma.center.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    if (!defaultCenter) {
      console.log('No center found, creating default center...');
      defaultCenter = await prisma.center.create({
        data: {
          name: 'Default Wash Center',
          address: 'Default Address',
          latitude: 0,
          longitude: 0,
          mobile: '0000000000',
          email: 'default@example.com',
          smsCredits: 10000, // Give initial credits
          slug: 'default-center'
        }
      });
      console.log(`✅ Created default center: ${defaultCenter.name} (${defaultCenter.id})\n`);
    } else {
      console.log(`✅ Using existing center: ${defaultCenter.name} (${defaultCenter.id})\n`);
      
      // Update existing center with SMS credits and slug if not set
      if (!defaultCenter.smsCredits || !defaultCenter.slug) {
        await prisma.center.update({
          where: { id: defaultCenter.id },
          data: {
            smsCredits: defaultCenter.smsCredits || 10000,
            totalSmsUsed: 0,
            slug: defaultCenter.slug || 'default-center'
          }
        });
        console.log('✅ Updated center with SMS credits and slug\n');
      }
    }

    // Step 2: Link all users without centerId to default center
    console.log('Linking users to default center...');
    const usersWithoutCenter = await prisma.user.findMany({
      where: {
        centerId: null,
        role: { in: ['ADMIN', 'WORKER'] } // Only ADMIN/WORKER need centerId
      },
      select: { id: true, name: true, role: true }
    });

    if (usersWithoutCenter.length > 0) {
      const result = await prisma.user.updateMany({
        where: {
          centerId: null,
          role: { in: ['ADMIN', 'WORKER'] }
        },
        data: {
          centerId: defaultCenter.id
        }
      });
      
      console.log(`✅ Linked ${result.count} users to default center:`);
      usersWithoutCenter.forEach(user => {
        console.log(`   - ${user.name || 'Unnamed'} (${user.role})`);
      });
      console.log();
    } else {
      console.log('✅ All ADMIN/WORKER users already have centerId\n');
    }

    // Step 3: Link all pricing without centerId to default center
    console.log('Linking pricing to default center...');
    const pricingWithoutCenter = await prisma.pricing.findMany({
      where: { centerId: null },
      select: { id: true, vehicleType: true, categoryName: true, price: true }
    });

    if (pricingWithoutCenter.length > 0) {
      const result = await prisma.pricing.updateMany({
        where: { centerId: null },
        data: { centerId: defaultCenter.id }
      });
      
      console.log(`✅ Linked ${result.count} pricing entries to default center:`);
      pricingWithoutCenter.forEach(p => {
        console.log(`   - ${p.vehicleType} - ${p.categoryName}: ₹${p.price}`);
      });
      console.log();
    } else {
      console.log('✅ All pricing entries already have centerId\n');
    }

    // Step 4: Verify vehicles are linked to centers
    console.log('Verifying vehicles are linked to centers...');
    const vehiclesWithoutCenter = await prisma.vehicle.count({
      where: { centerId: null }
    });

    if (vehiclesWithoutCenter > 0) {
      console.log(`⚠️  Found ${vehiclesWithoutCenter} vehicles without centerId`);
      console.log('   Linking them to default center...');
      
      await prisma.vehicle.updateMany({
        where: { centerId: null },
        data: { centerId: defaultCenter.id }
      });
      
      console.log(`✅ Linked ${vehiclesWithoutCenter} vehicles to default center\n`);
    } else {
      console.log('✅ All vehicles are linked to centers\n');
    }

    // Step 5: Verify slot bookings are linked to centers
    console.log('Verifying slot bookings are linked to centers...');
    const bookingsWithoutCenter = await prisma.slotBooking.count({
      where: { centerId: null }
    });

    if (bookingsWithoutCenter > 0) {
      console.log(`⚠️  Found ${bookingsWithoutCenter} slot bookings without centerId`);
      console.log('   Linking them to default center...');
      
      await prisma.slotBooking.updateMany({
        where: { centerId: null },
        data: { centerId: defaultCenter.id }
      });
      
      console.log(`✅ Linked ${bookingsWithoutCenter} bookings to default center\n`);
    } else {
      console.log('✅ All slot bookings are linked to centers\n');
    }

    // Step 6: Verify estimations are linked to centers
    console.log('Verifying estimations are linked to centers...');
    const estimationsWithoutCenter = await prisma.estimation.count({
      where: { centerId: null }
    });

    if (estimationsWithoutCenter > 0) {
      console.log(`⚠️  Found ${estimationsWithoutCenter} estimations without centerId`);
      console.log('   Linking them to default center...');
      
      await prisma.estimation.updateMany({
        where: { centerId: null },
        data: { centerId: defaultCenter.id }
      });
      
      console.log(`✅ Linked ${estimationsWithoutCenter} estimations to default center\n`);
    } else {
      console.log('✅ All estimations are linked to centers\n');
    }

    // Step 7: Summary
    console.log('📊 Migration Summary:');
    console.log('════════════════════════════════════════');
    
    const stats = await Promise.all([
      prisma.center.count(),
      prisma.user.count({ where: { centerId: defaultCenter.id } }),
      prisma.pricing.count({ where: { centerId: defaultCenter.id } }),
      prisma.vehicle.count({ where: { centerId: defaultCenter.id } }),
      prisma.slotBooking.count({ where: { centerId: defaultCenter.id } }),
      prisma.estimation.count({ where: { centerId: defaultCenter.id } }),
    ]);

    console.log(`Total Centers:        ${stats[0]}`);
    console.log(`Users in Center:      ${stats[1]}`);
    console.log(`Pricing in Center:    ${stats[2]}`);
    console.log(`Vehicles in Center:   ${stats[3]}`);
    console.log(`Bookings in Center:   ${stats[4]}`);
    console.log(`Estimations in Center: ${stats[5]}`);
    console.log('════════════════════════════════════════\n');

    console.log('✨ Multi-Tenant Migration Completed Successfully!\n');
    console.log('Next steps:');
    console.log('1. Run: npx prisma migrate dev --name add-multi-tenant-fields');
    console.log('2. Deploy backend with updated resolvers');
    console.log('3. Test with multiple centers\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateToMultiTenant()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
