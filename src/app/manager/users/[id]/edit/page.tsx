import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import EditUserForm from './EditUserForm';

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any).role || (session.user as any).role !== 'manager') {
    redirect('/login');
  }
  
  const user = await prisma.user.findUnique({ where: { id: id } });
  if (!user) return <div className="p-8">User not found</div>;

  return <EditUserForm user={user} />;
}
