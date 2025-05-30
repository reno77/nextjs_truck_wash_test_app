// Quick script to create a test user for washer role
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('Creating test washer user...');
    
    const user = await prisma.user.create({
      data: {
        id: 'test-washer-123',
        email: 'washer@test.com',
        fullName: 'Test Washer',
        role: 'washer',
      }
    });
    
    console.log('✓ Created test user:', user);
    console.log('✅ You can now manually add a session in Prisma Studio or modify middleware');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
