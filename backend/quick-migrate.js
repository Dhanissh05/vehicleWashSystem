/**
 * Quick Migration: Link existing data to default center
 * This runs automatically on startup to ensure multi-tenant compatibility
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function quickMigrate() {
  try {
    console.log('🔍 Checking for unmigrated data...');

    // Get or create default center
    let defaultCenter = await prisma.center.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    if (!defaultCenter) {
      console.log('📍 Creating default center...');
      defaultCenter = await prisma.center.create({
        data: {
          name: 'Default Wash Center',
          address: 'Default Address',
          latitude: 0,
          longitude: 0,
          mobile: '0000000000',
          smsCredits: 10000,
          totalSmsUsed: 0,
          slug: 'default'
        }
      });
      console.log(`✅ Created default center: ${defaultCenter.id}`);
    } else {
      // Update with multi-tenant fields if missing
      const updates = {};
      if (defaultCenter.smsCredits === null || defaultCenter.smsCredits === undefined) {
        updates.smsCredits = 10000;
        updates.totalSmsUsed = 0;
      }
      if (!defaultCenter.slug) {
        updates.slug = 'default';
      }
      
      if (Object.keys(updates).length > 0) {
        await prisma.center.update({
          where: { id: defaultCenter.id },
          data: updates
        });
        console.log('✅ Updated center with multi-tenant fields');
      }
    }

    // Link users without centerId
    const usersCount = await prisma.user.count({
      where: {
        centerId: null,
        role: { in: ['ADMIN', 'WORKER'] }
      }
    });

    if (usersCount > 0) {
      await prisma.user.updateMany({
        where: {
          centerId: null,
          role: { in: ['ADMIN', 'WORKER'] }
        },
        data: { centerId: defaultCenter.id }
      });
      console.log(`✅ Linked ${usersCount} users to default center`);
    }

    // Link pricing without centerId
    const pricingCount = await prisma.pricing.count({
      where: { centerId: null }
    });

    if (pricingCount > 0) {
      await prisma.pricing.updateMany({
        where: { centerId: null },
        data: { centerId: defaultCenter.id }
      });
      console.log(`✅ Linked ${pricingCount} pricing entries to default center`);
    }

    // Link vehicles, bookings, estimations
    const vehiclesCount = await prisma.vehicle.count({ where: { centerId: null } });
    if (vehiclesCount > 0) {
      await prisma.vehicle.updateMany({
        where: { centerId: null },
        data: { centerId: defaultCenter.id }
      });
      console.log(`✅ Linked ${vehiclesCount} vehicles to default center`);
    }

    const bookingsCount = await prisma.slotBooking.count({ where: { centerId: null } });
    if (bookingsCount > 0) {
      await prisma.slotBooking.updateMany({
        where: { centerId: null },
        data: { centerId: defaultCenter.id }
      });
      console.log(`✅ Linked ${bookingsCount} bookings to default center`);
    }

    const estimationsCount = await prisma.estimation.count({ where: { centerId: null } });
    if (estimationsCount > 0) {
      await prisma.estimation.updateMany({
        where: { centerId: null },
        data: { centerId: defaultCenter.id }
      });
      console.log(`✅ Linked ${estimationsCount} estimations to default center`);
    }

    if (usersCount === 0 && pricingCount === 0 && vehiclesCount === 0 && bookingsCount === 0 && estimationsCount === 0) {
      console.log('✅ All data already migrated to multi-tenant');
    }

    console.log('✨ Migration check complete\n');
  } catch (error) {
    console.error('⚠️ Migration error:', error.message);
    console.log('Continuing anyway...\n');
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  quickMigrate()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(0); // Exit 0 to not block startup
    });
}

module.exports = { quickMigrate };
