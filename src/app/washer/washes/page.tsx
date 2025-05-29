import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getImageUrl } from '@/lib/s3';
import Link from 'next/link';

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

  // Get pre-signed URLs for all images
  const washesWithUrls = await Promise.all(
    washes.map(async (wash) => ({
      ...wash,
      images: await Promise.all(
        wash.images.map(async (image) => ({
          ...image,
          viewUrl: await getImageUrl(image.imageKey),
        }))
      ),
    }))
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Wash Records</h1>
        <Link
          href="/washer/washes/create"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + New Wash
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License Plate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photos</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {washesWithUrls.map((wash) => (
              <tr key={wash.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  {new Date(wash.washDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">{wash.truck.licensePlate}</td>
                <td className="px-6 py-4">{wash.truck.driver?.fullName || 'N/A'}</td>
                <td className="px-6 py-4 capitalize">{wash.washType.toLowerCase()}</td>
                <td className="px-6 py-4">${wash.price.toString()}</td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    {wash.images.map((image) => (
                      <a
                        key={image.id}
                        href={image.viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {image.imageType}
                      </a>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/washer/washes/${wash.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
