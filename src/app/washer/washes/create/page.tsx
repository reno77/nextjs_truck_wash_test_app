import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import CreateWashForm from './CreateWashForm';

export default async function CreateWashPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'washer') {
    redirect('/login');
  }

  // Get all drivers
  const drivers = await prisma.user.findMany({
    where: {
      role: 'driver',
    },
    select: {
      id: true,
      fullName: true,
    },
    orderBy: {
      fullName: 'asc',
    },
  });

  return <CreateWashForm drivers={drivers} />;
}
