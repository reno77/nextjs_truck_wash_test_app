'use client';

import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * This page handles the completion of federated logout.
 * Google redirects here after the user has been logged out from Google's servers.
 * We then complete the logout by clearing the local NextAuth session.
 */
export default function SignoutCompletePage() {
  const router = useRouter();

  useEffect(() => {
    // Complete the logout by clearing the local session
    signOut({ redirect: false }).then(() => {
      // Redirect to the login page
      router.push('/login');
    });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold mb-2">Signing Out...</h1>
        <p className="text-gray-600">
          Please wait while we complete your logout process.
        </p>
      </div>
    </div>
  );
}
