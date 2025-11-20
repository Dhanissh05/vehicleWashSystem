const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Update all vehicles that have RECEIVED status to REGISTERED if they were added by customers
  const updated = await prisma.vehicle.updateMany({
    where: {
      status: 'RECEIVED',
      // Only update if there's no worker assigned (means it was customer-added)
      workerId: null
    },
    data: {
      status: 'REGISTERED',
      receivedAt: null
    }
  });

  console.log(`Updated ${updated.count} vehicles to REGISTERED status`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
