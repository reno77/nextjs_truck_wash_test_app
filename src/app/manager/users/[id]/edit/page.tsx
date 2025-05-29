import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session || !(session.user as any).role || (session.user as any).role !== 'manager') {
    redirect('/login');
  }
  const user = await prisma.user.findUnique({ where: { id: id } });
  if (!user) return <div className="p-8">User not found</div>;

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit User</h1>
      <form action={`/api/users/${user.id}`} method="POST" className="bg-white p-6 rounded shadow space-y-4">
        <div>
          <label className="block mb-1">Full Name</label>
          <input name="fullName" type="text" className="w-full border px-3 py-2 rounded" defaultValue={user.fullName} required />
        </div>
        <div>
          <label className="block mb-1">Email</label>
          <input name="email" type="email" className="w-full border px-3 py-2 rounded" defaultValue={user.email} required />
        </div>
        <div>
          <label className="block mb-1">Role</label>
          <select name="role" className="w-full border px-3 py-2 rounded" defaultValue={user.role} required>
            <option value="manager">Manager</option>
            <option value="washer">Washer</option>
            <option value="driver">Driver</option>
          </select>
        </div>
        <div>
          <label className="block mb-1">Password (leave blank to keep unchanged)</label>
          <input name="password" type="password" className="w-full border px-3 py-2 rounded" />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">Update User</button>
      </form>
    </div>
  );
}
