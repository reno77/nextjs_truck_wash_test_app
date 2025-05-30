import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import WashesClient from './WashesClient';

export default async function WashesPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'washer') {
    redirect('/login');
  }

  const washes = await prisma.washRecord.findMany({
    where: {
      washerId: (session.user as any).id,
    },
    include: {
      truck: {
        include: {
          driver: true,
        },
      },
      images: true,
    },
    orderBy: {
      washDate: 'desc',
    },
  });

  // Convert Decimal price to string for client component serialization
  const serializedWashes = washes.map(wash => ({
    ...wash,
    price: wash.price.toString(), // Convert Decimal to string
  })) as any; // Type assertion needed due to Decimal->string conversion

  return <WashesClient washes={serializedWashes} />;
}
