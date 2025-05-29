import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

export default async function DeleteUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session || !(session.user as any).role || (session.user as any).role !== 'manager') {
    redirect('/login');
  }
  const user = await prisma.user.findUnique({ where: { id: id } });
  if (!user) return <div className="p-8">User not found</div>;

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Delete User</h1>
      <div className="mb-4">Are you sure you want to delete <b>{user.fullName}</b> ({user.email})?</div>
      <form action={`/api/users/${user.id}/delete`} method="POST">
        <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Delete</button>
        <a href="/manager/users" className="ml-4 text-blue-600 hover:underline">Cancel</a>
      </form>
    </div>
  );
}
