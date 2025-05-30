const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWashes() {
  try {
    const washes = await prisma.washRecord.findMany({
      include: {
        truck: {
          include: {
            driver: true
          }
        },
        images: true
      }
    });
    
    console.log('Found wash records:', washes.length);
    washes.forEach((wash, index) => {
      console.log(`${index + 1}. ID: ${wash.id}, Truck: ${wash.truck.licensePlate}, Type: ${wash.washType}, Images: ${wash.images.length}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWashes();
