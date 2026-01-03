/**
 * Fix logo URLs in production database
 * Updates localhost/internal URLs to use public domain
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function fixLogoUrls() {
  try {
    console.log('🔍 Checking centers with logo URLs...\n');

    // Get all centers with logoUrl
    const centers = await prisma.center.findMany({
      where: {
        logoUrl: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        logoUrl: true
      }
    });

    console.log(`Found ${centers.length} centers with logos\n`);

    if (centers.length === 0) {
      console.log('No centers with logos found');
      return;
    }

    // Determine the correct base URL
    let baseUrl = process.env.BASE_URL;
    if (!baseUrl && process.env.RAILWAY_PUBLIC_DOMAIN) {
      baseUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    }
    
    if (!baseUrl) {
      console.error('❌ No BASE_URL or RAILWAY_PUBLIC_DOMAIN found in environment');
      console.log('Please set one of these environment variables and try again');
      return;
    }

    console.log(`Using base URL: ${baseUrl}\n`);

    // Fix each logo URL
    for (const center of centers) {
      const oldUrl = center.logoUrl;
      
      // Extract the filename from the old URL
      const match = oldUrl.match(/\/uploads\/logo\/(.+)$/);
      if (!match) {
        console.log(`⚠️  ${center.name}: Could not extract filename from ${oldUrl}`);
        continue;
      }

      const filename = match[1];
      const newUrl = `${baseUrl}/uploads/logo/${filename}`;

      // Only update if URL actually changed
      if (oldUrl !== newUrl) {
        await prisma.center.update({
          where: { id: center.id },
          data: { logoUrl: newUrl }
        });

        console.log(`✅ ${center.name}:`);
        console.log(`   Old: ${oldUrl}`);
        console.log(`   New: ${newUrl}\n`);
      } else {
        console.log(`✓  ${center.name}: URL already correct\n`);
      }
    }

    console.log('✨ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLogoUrls();
