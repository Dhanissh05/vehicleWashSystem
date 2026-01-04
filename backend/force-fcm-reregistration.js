/**
 * Force FCM Token Re-registration for All Customers
 * 
 * This script clears existing FCM tokens so users will be forced to re-register
 * the next time they open the app.
 * 
 * Usage: node force-fcm-reregistration.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function forceFcmReregistration() {
  try {
    console.log('🔄 Forcing FCM token re-registration for all customers...\n');
    console.log('📡 Database:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'Unknown');
    console.log('');

    // Get all customers with FCM tokens
    const customersWithTokens = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        fcmToken: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        mobile: true,
        fcmToken: true,
      },
    });

    console.log(`📊 Found ${customersWithTokens.length} customers with FCM tokens\n`);

    if (customersWithTokens.length === 0) {
      console.log('⚠️  No customers have FCM tokens yet.');
      console.log('💡 Customers need to open the updated app first to register tokens.');
      return;
    }

    // Clear all FCM tokens
    const result = await prisma.user.updateMany({
      where: {
        role: 'CUSTOMER',
        fcmToken: {
          not: null,
        },
      },
      data: {
        fcmToken: null,
      },
    });

    console.log(`✅ Cleared ${result.count} FCM tokens\n`);

    if (customersWithTokens.length > 0) {
      console.log('📋 Cleared tokens for:');
      customersWithTokens.forEach(user => {
        console.log(`  - ${user.name || 'No name'} (${user.mobile})`);
      });
    }

    console.log('\n💡 What happens next:');
    console.log('   1. When customers open the app, usePushNotifications hook will run');
    console.log('   2. The hook will detect no FCM token exists');
    console.log('   3. It will automatically request permissions and register new token');
    console.log('   4. New token will be saved to database within 10-30 seconds');
    console.log('');
    console.log('⏰ Timeline: Tokens will register as each customer opens their app');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

forceFcmReregistration();
