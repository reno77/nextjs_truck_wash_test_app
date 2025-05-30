// Quick script to reset authentication tables
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetAuth() {
  try {
    console.log('Clearing authentication tables...');
    
    // Delete all accounts first (foreign key constraint)
    await prisma.account.deleteMany();
    console.log('✓ Cleared Account table');
    
    // Delete all sessions
    await prisma.session.deleteMany();
    console.log('✓ Cleared Session table');
    
    // Delete all verification tokens
    await prisma.verificationToken.deleteMany();
    console.log('✓ Cleared VerificationToken table');
    
    // Delete all users (this will also delete related wash records due to cascade)
    await prisma.user.deleteMany();
    console.log('✓ Cleared User table');
    
    console.log('✅ Authentication tables reset successfully');
    console.log('You can now log in with Google OAuth again');
    
  } catch (error) {
    console.error('❌ Error resetting authentication tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAuth();
