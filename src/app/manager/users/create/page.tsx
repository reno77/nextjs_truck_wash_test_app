import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import CreateUserForm from './CreateUserForm';

export default async function CreateUserPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'manager') {
    redirect('/login');
  }

  return <CreateUserForm />;
}
