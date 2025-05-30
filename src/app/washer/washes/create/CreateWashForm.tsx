'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateAndCompressImage, IMAGE_CONFIG } from '@/lib/imageUtils';

interface Driver {
  id: string;
  fullName: string;
}

interface UploadStatus {
  before?: {
    status: 'idle' | 'compressing' | 'uploading' | 'done' | 'error';
    message?: string;
  };
  after?: {
    status: 'idle' | 'compressing' | 'uploading' | 'done' | 'error';
    message?: string;
  };
}

interface ImageUploadResult {
  key: string;
  viewUrl: string;
}

type WashType = 'basic' | 'premium' | 'deluxe';

export default function CreateWashForm({ drivers }: { drivers: Driver[] }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [beforeImage, setBeforeImage] = useState<ImageUploadResult | null>(null);
  const [afterImage, setAfterImage] = useState<ImageUploadResult | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({});

  async function handleImageUpload(file: File, imageType: 'before' | 'after'): Promise<ImageUploadResult> {
    try {
      // Update status to compressing
      setUploadStatus(prev => ({
        ...prev,
        [imageType]: { status: 'compressing', message: 'Compressing image...' }
      }));

      // Validate and compress image
      const { isValid, error, compressedFile } = await validateAndCompressImage(file);
      
      if (!isValid || !compressedFile) {
        throw new Error(error || 'Invalid image');
      }

      // Update status to uploading
      setUploadStatus(prev => ({
        ...prev,
        [imageType]: { status: 'uploading', message: 'Uploading...' }
      }));

      // Get presigned URL
      const presignedRes = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileType: compressedFile.type,
          fileSize: compressedFile.size,
          imageType,
        }),
      });

      if (!presignedRes.ok) {
        const errorText = await presignedRes.text();
        console.error('CreateWashForm - Upload API error response:', errorText);
        
        let errorMessage = 'Failed to get upload URL';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.details || errorMessage;
        } catch (parseError) {
          console.warn('CreateWashForm - Could not parse error response as JSON:', parseError);
          // Use the raw error text if JSON parsing fails
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const responseText = await presignedRes.text();
      console.log('CreateWashForm - Upload API success response:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('CreateWashForm - Failed to parse upload API response:', parseError);
        console.error('CreateWashForm - Response text:', responseText);
        console.error('CreateWashForm - Response starts with:', responseText.substring(0, 50));
        throw new Error('Invalid JSON response from upload API: ' + responseText.substring(0, 100));
      }

      const { uploadUrl, viewUrl, key } = responseData;

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

      // Update status to done
      setUploadStatus(prev => ({
        ...prev,
        [imageType]: { status: 'done', message: 'Uploaded successfully' }
      }));

      return { key, viewUrl };
    } catch (err: any) {
      setUploadStatus(prev => ({
        ...prev,
        [imageType]: { status: 'error', message: err.message }
      }));
      throw err;
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!beforeImage?.key || !afterImage?.key) {
      setError('Both before and after images are required');
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const driverId = formData.get('driverId');
    const washType = formData.get('washType') as WashType;
    const price = formData.get('price');
    const licensePlate = formData.get('licensePlate');
    const notes = formData.get('notes');

    // Validate required fields
    if (!driverId || !washType || !price || !licensePlate) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    // Validate wash type
    const validWashTypes: WashType[] = ['basic', 'premium', 'deluxe'];
    if (!validWashTypes.includes(washType)) {
      setError('Invalid wash type selected');
      setLoading(false);
      return;
    }

    // Validate price format
    const priceValue = parseFloat(price.toString());
    if (isNaN(priceValue) || priceValue <= 0) {
      setError('Please enter a valid price');
      setLoading(false);
      return;
    }

    const data = {
      licensePlate: licensePlate.toString().trim(),
      driverId: driverId.toString(),
      washType,
      price: priceValue.toFixed(2), // Ensure 2 decimal places
      notes: notes ? notes.toString().trim() : '',
      beforeImage: beforeImage.key,
      afterImage: afterImage.key,
    };

    try {
      const res = await fetch('/api/washes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create wash record');
      }

      router.push('/washer/washes');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the wash record');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Wash Record</h1>
      {error && (
        <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md border border-red-300">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block mb-1">License Plate</label>
          <input 
            name="licensePlate"
            type="text"
            required
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        
        <div>
          <label className="block mb-1">Driver</label>
          <select 
            name="driverId"
            required
            className="w-full border px-3 py-2 rounded"
          >
            <option value="">Select Driver</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.fullName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">Wash Type</label>
          <select 
            name="washType"
            required
            className="w-full border px-3 py-2 rounded"
          >
            <option value="">Select Type</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="deluxe">Deluxe</option>
          </select>
        </div>

        <div>
          <label className="block mb-1">Price ($)</label>
          <input 
            name="price"
            type="number"
            step="0.01"
            required
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block mb-1">
            Before Photo
            <span className="text-sm text-gray-500 ml-2">
              (Max size: {IMAGE_CONFIG.maxSizeMB}MB)
            </span>
          </label>
          <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg hover:border-gray-400 transition-colors">
            <input
              type="file"
              accept={IMAGE_CONFIG.allowedTypes.join(',')}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageUpload(file, 'before')
                    .then(result => {
                      setBeforeImage(result);
                      setError('');
                    })
                    .catch(err => {
                      console.error('Upload failed:', err);
                      setError(err.message || 'Failed to upload before image');
                    });
                }
              }}
              required
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-1">Click to select or drag and drop</p>
          </div>
          {uploadStatus.before && (
            <p className={`mt-1 text-sm ${
              uploadStatus.before.status === 'done' ? 'text-green-600' :
              uploadStatus.before.status === 'error' ? 'text-red-600' :
              'text-blue-600'
            }`}>
              {uploadStatus.before.message}
            </p>
          )}
          {beforeImage?.viewUrl && (
            <img src={beforeImage.viewUrl} alt="Before" className="mt-2 h-32 object-cover rounded" />
          )}
        </div>

        <div>
          <label className="block mb-1">
            After Photo
            <span className="text-sm text-gray-500 ml-2">
              (Max size: {IMAGE_CONFIG.maxSizeMB}MB)
            </span>
          </label>
          <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg hover:border-gray-400 transition-colors">
            <input
              type="file"
              accept={IMAGE_CONFIG.allowedTypes.join(',')}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageUpload(file, 'after')
                    .then(result => {
                      setAfterImage(result);
                      setError('');
                    })
                    .catch(err => {
                      console.error('Upload failed:', err);
                      setError(err.message || 'Failed to upload after image');
                    });
                }
              }}
              required
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-1">Click to select or drag and drop</p>
          </div>
          {uploadStatus.after && (
            <p className={`mt-1 text-sm ${
              uploadStatus.after.status === 'done' ? 'text-green-600' :
              uploadStatus.after.status === 'error' ? 'text-red-600' :
              'text-blue-600'
            }`}>
              {uploadStatus.after.message}
            </p>
          )}
          {afterImage?.viewUrl && (
            <img src={afterImage.viewUrl} alt="After" className="mt-2 h-32 object-cover rounded" />
          )}
        </div>

        <div>
          <label className="block mb-1">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <button
          type="submit"
          disabled={
            loading || 
            !beforeImage || 
            !afterImage || 
            uploadStatus.before?.status === 'error' || 
            uploadStatus.after?.status === 'error'
          }
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:bg-blue-400"
        >
          {loading ? 'Creating...' : 'Create Wash Record'}
        </button>
      </form>
    </div>
  );
}
