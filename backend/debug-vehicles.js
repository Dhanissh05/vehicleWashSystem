const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVehicles() {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: { 
        slotBooking: {
          include: {
            services: true
          }
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log('=== RECENT VEHICLES ===');
    console.log(`Total: ${vehicles.length}`);
    
    vehicles.forEach(v => {
      console.log(`\nVehicle: ${v.vehicleNumber}`);
      console.log(`  Status: ${v.status}`);
      console.log(`  ServiceType: ${v.serviceType}`);
      console.log(`  SlotBookingId: ${v.slotBookingId}`);
      console.log(`  Has SlotBooking: ${!!v.slotBooking}`);
      if (v.slotBooking) {
        console.log(`  SlotBooking Status: ${v.slotBooking.status}`);
        console.log(`  Services: ${v.slotBooking.services?.length || 0}`);
      }
    });
    
    const received = vehicles.filter(v => v.status === 'RECEIVED');
    console.log(`\nRECEIVED vehicles: ${received.length}`);
    
    const withSlotBooking = vehicles.filter(v => v.slotBookingId);
    console.log(`Vehicles with slot booking: ${withSlotBooking.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVehicles();
