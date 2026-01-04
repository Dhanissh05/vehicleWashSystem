/**
 * Get Admin Token for GraphQL Queries
 * 
 * This script helps you get an admin authentication token to use with GraphQL queries.
 * 
 * Usage:
 * 1. Run: node get-admin-token.js
 * 2. Copy the token
 * 3. Use it in GraphQL Playground or API calls
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const prisma = new PrismaClient();

async function getAdminToken() {
  try {
    console.log('🔐 Getting Admin Token...\n');
    console.log('📡 Database:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'Unknown');
    console.log('');

    // Default admin credentials
    const adminMobile = '9999999999';
    const adminPassword = 'admin123';

    // Find admin
    const admin = await prisma.user.findUnique({
      where: { mobile: adminMobile },
    });

    if (!admin) {
      console.error('❌ Admin user not found!');
      console.error('   Mobile: ' + adminMobile);
      console.error('\n💡 Create admin first:');
      console.error('   1. Check your database for existing admin users');
      console.error('   2. Or run seed script to create admin');
      return;
    }

    console.log('✅ Admin found:');
    console.log(`   Name: ${admin.name}`);
    console.log(`   Mobile: ${admin.mobile}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Active: ${admin.isActive}`);
    console.log('');

    // Verify password
    if (!admin.password) {
      console.error('❌ Admin has no password set!');
      console.error('\n💡 Reset admin password:');
      console.error('   Run: node reset-admin-password.js');
      return;
    }

    const isValidPassword = await bcrypt.compare(adminPassword, admin.password);
    if (!isValidPassword) {
      console.error('❌ Invalid password!');
      console.error(`   Expected password: ${adminPassword}`);
      console.error('\n💡 Reset admin password:');
      console.error('   Run: node reset-admin-password.js');
      return;
    }

    // Check if account is active
    if (!admin.isActive) {
      console.error('❌ Admin account is deactivated!');
      return;
    }

    // Generate token
    const token = jwt.sign(
      { 
        id: admin.id, 
        mobile: admin.mobile, 
        role: admin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log('🎫 Admin Token Generated!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(token);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 How to use this token:\n');
    
    console.log('1️⃣  GraphQL Playground (Railway/Production):');
    console.log('   - Open: https://your-railway-app.railway.app/graphql');
    console.log('   - Click "HTTP HEADERS" at bottom');
    console.log('   - Add this:');
    console.log('     {');
    console.log('       "Authorization": "Bearer ' + token + '"');
    console.log('     }');
    console.log('');

    console.log('2️⃣  Using cURL:');
    console.log('   curl -X POST https://your-railway-app.railway.app/graphql \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -H "Authorization: Bearer ' + token + '" \\');
    console.log('     -d \'{"query":"{ users { id name role } }"}\'');
    console.log('');

    console.log('3️⃣  Using Postman/Insomnia:');
    console.log('   - URL: https://your-railway-app.railway.app/graphql');
    console.log('   - Method: POST');
    console.log('   - Headers:');
    console.log('     Authorization: Bearer ' + token);
    console.log('     Content-Type: application/json');
    console.log('   - Body (GraphQL):');
    console.log('     { users { id name role } }');
    console.log('');

    console.log('4️⃣  Check FCM tokens with GraphQL query:');
    console.log('   query {');
    console.log('     users(where: { role: { equals: CUSTOMER } }) {');
    console.log('       id');
    console.log('       name');
    console.log('       mobile');
    console.log('       fcmToken');
    console.log('     }');
    console.log('   }');
    console.log('');

    console.log('⏰ Token expires in: ' + (process.env.JWT_EXPIRES_IN || '7 days'));
    console.log('');

    // Login credentials for reference
    console.log('📝 Admin Login Credentials:');
    console.log(`   Mobile: ${adminMobile}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check .env file has DATABASE_URL and JWT_SECRET');
    console.error('   2. Make sure database is accessible');
    console.error('   3. Run: npm install');
  } finally {
    await prisma.$disconnect();
  }
}

getAdminToken();
