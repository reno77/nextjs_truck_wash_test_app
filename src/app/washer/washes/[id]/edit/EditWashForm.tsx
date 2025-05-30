'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WashRecord, Truck, User, WashImage, ImageType } from '@prisma/client';
import { getImageUrl } from '@/lib/s3-client';
import { validateAndCompressImage, IMAGE_CONFIG } from '@/lib/imageUtils';

interface WashRecordWithRelations extends Omit<WashRecord, 'price'> {
  price: string; // Accept string for client serialization
  truck: Truck & {
    driver: User | null;
  };
  images: WashImage[];
}

interface Driver {
  id: string;
  fullName: string;
  email: string;
}

interface EditWashFormProps {
  washRecord: WashRecordWithRelations;
  drivers: Driver[];
}

export default function EditWashForm({ washRecord, drivers }: EditWashFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    licensePlate: washRecord.truck.licensePlate,
    driverId: washRecord.truck.driver?.id || '',
    washType: washRecord.washType.toLowerCase(),
    price: washRecord.price.toString(),
    notes: washRecord.notes || '',
  });

  // Image state
  const [beforeImage, setBeforeImage] = useState<File | null>(null);
  const [afterImage, setAfterImage] = useState<File | null>(null);
  const [beforeImagePreview, setBeforeImagePreview] = useState<string>('');
  const [afterImagePreview, setAfterImagePreview] = useState<string>('');
  const [currentImages] = useState(washRecord.images);

  // Load current image URLs
  useEffect(() => {
    const loadCurrentImages = async () => {
      const beforeImg = currentImages.find(img => img.imageType === ImageType.before);
      const afterImg = currentImages.find(img => img.imageType === ImageType.after);
      
      if (beforeImg) {
        const beforeUrl = await getImageUrl(beforeImg.imageKey);
        setBeforeImagePreview(beforeUrl);
      }
      if (afterImg) {
        const afterUrl = await getImageUrl(afterImg.imageKey);
        setAfterImagePreview(afterUrl);
      }
    };
    loadCurrentImages();
  }, [currentImages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, imageType: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      if (imageType === 'before') {
        setBeforeImage(file);
        setBeforeImagePreview(URL.createObjectURL(file));
      } else {
        setAfterImage(file);
        setAfterImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const uploadImage = async (file: File, type: 'before' | 'after'): Promise<string> => {
    try {
      // Validate and compress image
      const { isValid, error, compressedFile } = await validateAndCompressImage(file);
      
      if (!isValid || !compressedFile) {
        throw new Error(error || 'Invalid image');
      }

      // Get presigned URL
      const requestBody = {
        fileType: compressedFile.type,
        fileSize: compressedFile.size,
        imageType: type,
      };
      
      console.log('EditWashForm - Sending to upload API:', requestBody);
      
      const presignedRes = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!presignedRes.ok) {
        const errorText = await presignedRes.text();
        console.error('EditWashForm - Upload API error response:', errorText);
        
        let errorMessage = 'Failed to get upload URL';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.details || errorMessage;
        } catch (parseError) {
          console.warn('EditWashForm - Could not parse error response as JSON:', parseError);
          // Use the raw error text if JSON parsing fails
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const responseText = await presignedRes.text();
      console.log('EditWashForm - Upload API success response:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('EditWashForm - Failed to parse upload API response:', parseError);
        console.error('EditWashForm - Response text:', responseText);
        console.error('EditWashForm - Response starts with:', responseText.substring(0, 50));
        throw new Error('Invalid JSON response from upload API: ' + responseText.substring(0, 100));
      }

      const { uploadUrl, key } = responseData;

      // Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: compressedFile,
        headers: {
          'Content-Type': compressedFile.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload image');
      }

      return key;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to upload image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let beforeImageKey = currentImages.find(img => img.imageType === ImageType.before)?.imageKey;
      let afterImageKey = currentImages.find(img => img.imageType === ImageType.after)?.imageKey;

      // Upload new images if provided
      if (beforeImage) {
        beforeImageKey = await uploadImage(beforeImage, 'before');
      }
      if (afterImage) {
        afterImageKey = await uploadImage(afterImage, 'after');
      }

      if (!beforeImageKey || !afterImageKey) {
        throw new Error('Before and after images are required');
      }

      const updateData = {
        ...formData,
        price: parseFloat(formData.price),
        beforeImage: beforeImageKey,
        afterImage: afterImageKey,
      };

      const response = await fetch(`/api/washes/${washRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update wash record');
      }

      router.push('/washer/washes');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="licensePlate" className="block text-sm font-medium text-gray-700 mb-2">
            License Plate
          </label>
          <input
            type="text"
            id="licensePlate"
            name="licensePlate"
            value={formData.licensePlate}
            onChange={handleInputChange}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="driverId" className="block text-sm font-medium text-gray-700 mb-2">
            Driver
          </label>
          <select
            id="driverId"
            name="driverId"
            value={formData.driverId}
            onChange={handleInputChange}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a driver</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.fullName} ({driver.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="washType" className="block text-sm font-medium text-gray-700 mb-2">
            Wash Type
          </label>
          <select
            id="washType"
            name="washType"
            value={formData.washType}
            onChange={handleInputChange}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select wash type</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="deluxe">Deluxe</option>
          </select>
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
            Price ($)
          </label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleInputChange}
            min="0"
            step="0.01"
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Before Image
            <span className="text-sm text-gray-500 ml-2">
              (Max size: {IMAGE_CONFIG.maxSizeMB}MB)
            </span>
          </label>
          {beforeImagePreview && (
            <div className="mb-2">
              <img
                src={beforeImagePreview}
                alt="Before"
                className="w-full h-48 object-cover rounded border"
              />
            </div>
          )}
          <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg hover:border-gray-400 transition-colors">
            <input
              type="file"
              accept={IMAGE_CONFIG.allowedTypes.join(',')}
              onChange={(e) => handleImageChange(e, 'before')}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-1">Click to select or drag and drop</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            After Image
            <span className="text-sm text-gray-500 ml-2">
              (Max size: {IMAGE_CONFIG.maxSizeMB}MB)
            </span>
          </label>
          {afterImagePreview && (
            <div className="mb-2">
              <img
                src={afterImagePreview}
                alt="After"
                className="w-full h-48 object-cover rounded border"
              />
            </div>
          )}
          <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg hover:border-gray-400 transition-colors">
            <input
              type="file"
              accept={IMAGE_CONFIG.allowedTypes.join(',')}
              onChange={(e) => handleImageChange(e, 'after')}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-1">Click to select or drag and drop</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex space-x-4">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Updating...' : 'Update Wash Record'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
