import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';

async function requireManager() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user && (session.user as any).role === 'manager')) {
    redirect('/login');
  }
}

export default async function UsersPage() {
  await requireManager();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <Link href="/manager/users/create" className="mb-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">+ Create User</Link>
      <table className="min-w-full bg-white border rounded shadow mt-4">
        <thead>
          <tr>
            <th className="px-4 py-2 border">Name</th>
            <th className="px-4 py-2 border">Email</th>
            <th className="px-4 py-2 border">Role</th>
            <th className="px-4 py-2 border">Created</th>
            <th className="px-4 py-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td className="px-4 py-2 border">{user.fullName}</td>
              <td className="px-4 py-2 border">{user.email}</td>
              <td className="px-4 py-2 border">{user.role}</td>
              <td className="px-4 py-2 border">{new Date(user.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-2 border">
                <Link href={`/manager/users/${user.id}/edit`} className="text-blue-600 hover:underline mr-2">Edit</Link>
                <Link href={`/manager/users/${user.id}/delete`} className="text-red-600 hover:underline">Delete</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
