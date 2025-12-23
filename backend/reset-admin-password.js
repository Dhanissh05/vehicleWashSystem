const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    const admin = await prisma.user.findUnique({
      where: { mobile: '9999999999' },
    });

    if (!admin) {
      console.log('❌ Admin not found');
      return;
    }

    console.log('Admin found:', { id: admin.id, name: admin.name, role: admin.role });

    // Set password to "admin123"
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    });

    console.log('✅ Admin password reset to: admin123');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
