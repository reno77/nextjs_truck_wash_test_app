'use client';

import { useSession, signOut } from 'next-auth/react';
import { federatedLogout } from '@/lib/federatedLogout';

function DebugPage() {
  const { data: session, status } = useSession();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Session & Logout</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">Session Status</h2>
        <p><strong>Status:</strong> {status}</p>
      </div>

      {session && (
        <div className="bg-blue-50 p-4 rounded mb-6">
          <h2 className="text-lg font-semibold mb-2">Session Data</h2>
          <pre className="text-sm bg-white p-2 rounded overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={() => {
            console.log('Testing federatedLogout...');
            federatedLogout();
          }}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mr-4"
        >
          Test Federated Logout
        </button>

        <button
          onClick={() => {
            console.log('Testing regular signOut...');
            signOut({ callbackUrl: '/login' });
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-4"
        >
          Test Regular Sign Out
        </button>

        <button
          onClick={async () => {
            console.log('Testing federated logout API...');
            try {
              const response = await fetch('/api/auth/federated-logout');
              const data = await response.json();
              console.log('API Response:', data);
            } catch (error) {
              console.error('API Error:', error);
            }
          }}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Test Logout API
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>First, log in with Google OAuth</li>
          <li>Come back to this page to see session data</li>
          <li>Test the logout buttons and check console logs</li>
        </ol>
      </div>
    </div>
  );
}

export default DebugPage;
