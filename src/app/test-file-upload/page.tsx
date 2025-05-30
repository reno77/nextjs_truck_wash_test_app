'use client';

import { useState } from 'react';
import { validateAndCompressImage, IMAGE_CONFIG } from '@/lib/imageUtils';

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

export default function TestUploadForm() {
  const [error, setError] = useState('');
  const [beforeImage, setBeforeImage] = useState<ImageUploadResult | null>(null);
  const [afterImage, setAfterImage] = useState<ImageUploadResult | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({});

  async function handleImageUpload(file: File, imageType: 'before' | 'after'): Promise<ImageUploadResult> {
    try {
      console.log(`Starting ${imageType} image upload:`, file.name, file.size, file.type);
      
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

      console.log(`${imageType} image compressed:`, compressedFile.size);

      // Update status to uploading
      setUploadStatus(prev => ({
        ...prev,
        [imageType]: { status: 'uploading', message: 'Uploading...' }
      }));

      // For testing, we'll just simulate an upload
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update status to done
      setUploadStatus(prev => ({
        ...prev,
        [imageType]: { status: 'done', message: 'Upload simulated successfully' }
      }));

      return { 
        key: `test-${imageType}-${Date.now()}`, 
        viewUrl: URL.createObjectURL(compressedFile) 
      };
    } catch (err: any) {
      setUploadStatus(prev => ({
        ...prev,
        [imageType]: { status: 'error', message: err.message }
      }));
      throw err;
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test File Upload Form</h1>
      <p className="mb-4 text-gray-600">This page tests the file upload functionality without authentication.</p>
      
      {error && (
        <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md border border-red-300">
          {error}
        </div>
      )}
      
      <div className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block mb-1">
            Before Photo Test
            <span className="text-sm text-gray-500 ml-2">
              (Max size: {IMAGE_CONFIG.maxSizeMB}MB)
            </span>
          </label>
          <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg">
            <input
              type="file"
              accept={IMAGE_CONFIG.allowedTypes.join(',')}
              onChange={(e) => {
                console.log('Before file input onChange triggered', e.target.files);
                const file = e.target.files?.[0];
                if (file) {
                  console.log('Before file selected:', file.name, file.size, file.type);
                  handleImageUpload(file, 'before')
                    .then(result => {
                      console.log('Before upload successful:', result);
                      setBeforeImage(result);
                      setError('');
                    })
                    .catch(err => {
                      console.error('Before upload failed:', err);
                      setError(err.message || 'Failed to upload before image');
                    });
                } else {
                  console.log('No before file selected');
                }
              }}
              className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer bg-white"
              style={{ zIndex: 10 }}
            />
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
            After Photo Test
            <span className="text-sm text-gray-500 ml-2">
              (Max size: {IMAGE_CONFIG.maxSizeMB}MB)
            </span>
          </label>
          <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg">
            <input
              type="file"
              accept={IMAGE_CONFIG.allowedTypes.join(',')}
              onChange={(e) => {
                console.log('After file input onChange triggered', e.target.files);
                const file = e.target.files?.[0];
                if (file) {
                  console.log('After file selected:', file.name, file.size, file.type);
                  handleImageUpload(file, 'after')
                    .then(result => {
                      console.log('After upload successful:', result);
                      setAfterImage(result);
                      setError('');
                    })
                    .catch(err => {
                      console.error('After upload failed:', err);
                      setError(err.message || 'Failed to upload after image');
                    });
                } else {
                  console.log('No after file selected');
                }
              }}
              className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer bg-white"
              style={{ zIndex: 10 }}
            />
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

        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-semibold mb-2">Test Results:</h3>
          <p>Before Image: {beforeImage ? '✅ Uploaded' : '❌ Not uploaded'}</p>
          <p>After Image: {afterImage ? '✅ Uploaded' : '❌ Not uploaded'}</p>
        </div>
      </div>
    </div>
  );
}
