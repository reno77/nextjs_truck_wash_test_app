'use client';

import { federatedLogout } from '@/lib/federatedLogout';
import { signOut } from 'next-auth/react';

export default function LogoutTestPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Logout Test Page</h1>
      <p className="mb-6">This page tests logout functionality without requiring authentication.</p>
      
      <div className="space-y-4">
        <button
          onClick={async () => {
            console.log('Testing federatedLogout...');
            try {
              await federatedLogout();
              console.log('federatedLogout completed successfully');
            } catch (error) {
              console.error('federatedLogout failed:', error);
            }
          }}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mr-4"
        >
          Test Federated Logout
        </button>

        <button
          onClick={async () => {
            console.log('Testing regular signOut...');
            try {
              await signOut({ callbackUrl: '/login' });
              console.log('signOut completed successfully');
            } catch (error) {
              console.error('signOut failed:', error);
            }
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4"
        >
          Test Regular Sign Out
        </button>

        <button
          onClick={async () => {
            console.log('Testing API call...');
            try {
              const response = await fetch('/api/auth/federated-logout');
              const data = await response.json();
              console.log('API Response:', data);
            } catch (error) {
              console.error('API call failed:', error);
            }
          }}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Test API Call
        </button>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Open browser developer tools (F12)</li>
          <li>Go to Console tab</li>
          <li>Click the buttons above</li>
          <li>Watch the console output for debug logs</li>
        </ol>
      </div>
    </div>
  );
}
