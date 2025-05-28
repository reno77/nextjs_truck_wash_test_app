import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

export default async function ManagerDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'manager') {
    redirect('/login');
  }

  // Fetch wash stats
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const dailyCount = await prisma.washRecord.count({
    where: {
      washDate: {
        gte: startOfToday,
        lte: endOfToday,
      },
    },
  });

  console.log('Daily count query date range:', { startOfToday, endOfToday, count: dailyCount });

  const washes = await prisma.washRecord.findMany({
    take: 50,
    include: {
      washer: true,
      truck: true,
    },
    orderBy: {
      washDate: 'desc',
    },
  });

  console.log('Found washes:', washes.length);
  
  if (washes.length > 0) {
    console.log('Sample wash record:', {
      id: washes[0].id,
      date: washes[0].washDate,
      washerName: washes[0].washer?.fullName,
      licensePlate: washes[0].truck?.licensePlate,
    });
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Manager Dashboard</h1>
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-blue-100 p-6 rounded-lg shadow-md">
          <div className="text-lg font-semibold text-blue-800">Trucks Washed Today</div>
          <div className="text-4xl font-bold text-blue-900">{dailyCount}</div>
        </div>
        <div className="bg-green-100 p-6 rounded-lg shadow-md">
          <div className="text-lg font-semibold text-green-800">Total Washes</div>
          <div className="text-4xl font-bold text-green-900">{washes.length}</div>
        </div>
      </div>
      <h2 className="text-2xl font-semibold mb-4">Recent Washes</h2>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Plate</th>
              <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Washer</th>
              <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {washes.map(wash => (
              <tr key={wash.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(wash.washDate).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {wash.truck?.licensePlate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {wash.washer?.fullName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${wash.washType === 'basic' ? 'bg-gray-100 text-gray-800' : 
                      wash.washType === 'premium' ? 'bg-blue-100 text-blue-800' : 
                      'bg-green-100 text-green-800'}`}>
                    {wash.washType.charAt(0).toUpperCase() + wash.washType.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${Number(wash.price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
