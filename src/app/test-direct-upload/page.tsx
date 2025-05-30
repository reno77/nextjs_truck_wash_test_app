'use client';

import { useState } from 'react';

export default function TestUploadPage() {
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const testDirectUpload = async () => {
    try {
      addLog('Testing direct upload API...');
      setStatus('Testing...');

      const requestBody = {
        fileType: 'image/jpeg',
        fileSize: 1024,
        imageType: 'before',
      };
      
      addLog(`Request body: ${JSON.stringify(requestBody)}`);

      const response = await fetch('/api/test-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      addLog(`Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        addLog(`Error response: ${errorText}`);
        throw new Error(errorText);
      }

      const responseText = await response.text();
      addLog(`Success response: ${responseText}`);
      
      const responseData = JSON.parse(responseText);
      addLog(`Parsed response: ${JSON.stringify(responseData, null, 2)}`);

      setStatus('Test successful!');
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Upload API (No Auth)</h1>
      
      <div className="mb-6">
        <button
          onClick={testDirectUpload}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Test Direct Upload API
        </button>
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
