'use client';

import { useState } from 'react';
import { validateAndCompressImage } from '@/lib/imageUtils';

export default function DebugUploadPage() {
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const testUpload = async (file: File) => {
    try {
      addLog('Starting upload test...');
      setStatus('Testing upload...');

      // Validate and compress image
      addLog('Validating and compressing image...');
      const { isValid, error, compressedFile } = await validateAndCompressImage(file);
      
      if (!isValid || !compressedFile) {
        throw new Error(error || 'Invalid image');
      }
      addLog(`Image validated. Size: ${compressedFile.size}, Type: ${compressedFile.type}`);

      // Prepare request body
      const requestBody = {
        fileType: compressedFile.type,
        fileSize: compressedFile.size,
        imageType: 'before' as const,
      };
      
      addLog(`Request body: ${JSON.stringify(requestBody)}`);

      // Get presigned URL
      addLog('Sending request to /api/upload...');
      const presignedRes = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      addLog(`Response status: ${presignedRes.status} ${presignedRes.statusText}`);

      if (!presignedRes.ok) {
        const errorText = await presignedRes.text();
        addLog(`Error response: ${errorText}`);
        throw new Error(errorText);
      }

      const responseText = await presignedRes.text();
      addLog(`Success response: ${responseText}`);
      
      const responseData = JSON.parse(responseText);
      addLog(`Parsed response: ${JSON.stringify(responseData, null, 2)}`);

      setStatus('Upload test successful!');
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      testUpload(file);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Debug Upload API</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Select image to test upload:
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <div className="mb-4">
        <strong>Status:</strong> {status}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Logs:</h2>
        <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="text-sm mb-1 font-mono">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
