'use client';

import { useState } from 'react';

export default function TestUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed!', e.target.files);
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      console.log('Selected file:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
    }
  };

  const handleButtonClick = () => {
    console.log('Button clicked - triggering file input');
    document.getElementById('file-input')?.click();
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test File Upload</h1>
      
      {error && (
        <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Method 1: Direct File Input</h2>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Method 2: Hidden Input + Button</h2>
          <input
            id="file-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleButtonClick}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Choose File
          </button>
        </div>

        {selectedFile && (
          <div className="bg-green-50 p-4 rounded">
            <h3 className="font-semibold">Selected File:</h3>
            <p>Name: {selectedFile.name}</p>
            <p>Size: {(selectedFile.size / 1024).toFixed(2)} KB</p>
            <p>Type: {selectedFile.type}</p>
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <p>User Agent: {navigator.userAgent}</p>
          <p>File API supported: {window.File ? 'Yes' : 'No'}</p>
          <p>FileReader supported: {window.FileReader ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
}
