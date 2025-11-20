const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const mobile = '9790974256';
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { mobile }
  });
  
  console.log('User:', user);
  
  if (user) {
    // Find vehicles for this user
    const vehicles = await prisma.vehicle.findMany({
      where: { customerId: user.id },
      include: {
        customer: true,
        worker: true,
        center: true
      }
    });
    
    console.log('\nVehicles for this user:', vehicles);
  }
  
  // Also check all vehicles
  const allVehicles = await prisma.vehicle.findMany({
    include: {
      customer: true
    }
  });
  
  console.log('\nAll vehicles in database:');
  allVehicles.forEach(v => {
    console.log(`- ${v.vehicleNumber}: customer ${v.customer.mobile} (${v.customer.name}), status: ${v.status}`);
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
