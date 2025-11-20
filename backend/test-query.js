const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function main() {
  const mobile = '9790974256';
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { mobile }
  });
  
  console.log('User ID:', user.id);
  
  // Generate token for this user
  const token = jwt.sign(
    { userId: user.id, mobile: user.mobile, role: user.role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '30d' }
  );
  
  console.log('\nToken for testing:', token);
  console.log('\nTest this in GraphQL Playground:');
  console.log('1. Go to http://localhost:4000/graphql');
  console.log('2. Set HTTP Header:');
  console.log(JSON.stringify({ Authorization: `Bearer ${token}` }, null, 2));
  console.log('\n3. Run this query:');
  console.log(`
query {
  myVehicles {
    id
    vehicleNumber
    vehicleType
    status
    createdAt
    receivedAt
    customer {
      mobile
      name
    }
  }
}
  `);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
