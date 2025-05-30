import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import EditWashForm from './EditWashForm';

interface EditWashPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditWashPage({ params }: EditWashPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'washer') {
    redirect('/login');
  }

  const washId = parseInt(id);
  if (isNaN(washId)) {
    notFound();
  }

  // Fetch the wash record with related data
  const washRecord = await prisma.washRecord.findFirst({
    where: {
      id: washId,
      washerId: (session.user as any).id, // Ensure washer can only edit their own records
    },
    include: {
      truck: {
        include: {
          driver: true,
        },
      },
      images: true,
    },
  });

  if (!washRecord) {
    notFound();
  }

  // Fetch all drivers for the form
  const drivers = await prisma.user.findMany({
    where: { role: 'driver' },
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Wash Record</h1>
      <EditWashForm washRecord={washRecord} drivers={drivers} />
    </div>
  );
}
