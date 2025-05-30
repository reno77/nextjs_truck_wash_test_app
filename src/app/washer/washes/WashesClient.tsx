'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WashRecord, Truck, User, WashImage } from '@prisma/client';
import { getImageUrl } from '@/lib/s3-client';

// Serialized version for client components (Decimal -> string)
interface SerializedWashRecord extends Omit<WashRecord, 'price'> {
  price: string; // Decimal serialized as string
  truck: Truck & {
    driver: User | null;
  };
  images: WashImage[];
}

interface WashesClientProps {
  washes: SerializedWashRecord[];
}

interface WashWithUrls extends SerializedWashRecord {
  images: (WashImage & { viewUrl: string })[];
}

export default function WashesClient({ washes }: WashesClientProps) {
  const router = useRouter();
  const [washesWithUrls, setWashesWithUrls] = useState<WashWithUrls[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Load image URLs on component mount
  useEffect(() => {
    const loadImageUrls = async () => {
      try {
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
        setWashesWithUrls(washesWithUrls);
      } catch (error) {
        console.error('Error loading image URLs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadImageUrls();
  }, [washes]);

  const handleDelete = async (washId: number) => {
    if (deleteConfirm !== washId) {
      setDeleteConfirm(washId);
      return;
    }

    try {
      const response = await fetch(`/api/washes/${washId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete wash record');
      }

      // Remove the deleted wash from the state
      setWashesWithUrls(prev => prev.filter(wash => wash.id !== washId));
      setDeleteConfirm(null);
      
      // Optionally refresh the page to ensure data consistency
      router.refresh();
    } catch (error) {
      console.error('Error deleting wash record:', error);
      alert('Failed to delete wash record. Please try again.');
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading wash records...</div>
        </div>
      </div>
    );
  }

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

      {washesWithUrls.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No wash records found.</p>
          <Link
            href="/washer/washes/create"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Create Your First Wash Record
          </Link>
        </div>
      ) : (
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
                    <div className="flex justify-end space-x-2">
                      <Link
                        href={`/washer/washes/${wash.id}/edit`}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <span className="text-gray-300">|</span>
                      {deleteConfirm === wash.id ? (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleDelete(wash.id)}
                            className="text-red-600 hover:underline text-sm"
                          >
                            Confirm
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={cancelDelete}
                            className="text-gray-600 hover:underline text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDelete(wash.id)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
