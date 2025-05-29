import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
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
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-blue-800">
          <strong>Note:</strong> Users are automatically registered when they sign in with Google. 
          New users get the &quot;driver&quot; role by default. Use the actions below to change user roles as needed.
        </p>
      </div>
      
      <table className="min-w-full bg-white border rounded shadow mt-4">
        <thead>
          <tr>
            <th className="px-4 py-2 border">Name</th>
            <th className="px-4 py-2 border">Email</th>
            <th className="px-4 py-2 border">Role</th>
            <th className="px-4 py-2 border">Joined</th>
            <th className="px-4 py-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td className="px-4 py-2 border">{user.fullName}</td>
              <td className="px-4 py-2 border">{user.email}</td>
              <td className="px-4 py-2 border">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  user.role === 'manager' ? 'bg-purple-100 text-purple-800' :
                  user.role === 'washer' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {user.role}
                </span>
              </td>
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
