import { signOut } from 'next-auth/react';

/**
 * Performs a federated logout that signs the user out from both
 * the application and Google's authentication server
 */
export async function federatedLogout() {
  console.log('federatedLogout called'); // Debug log
  
  try {
    console.log('Fetching federated logout API...'); // Debug log
    const response = await fetch('/api/auth/federated-logout');
    
    if (!response.ok) {
      console.error('API response not ok:', response.status, response.statusText);
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Federated logout response:', data); // Debug log
    
    if (data.url) {
      // If we get a Google logout URL, redirect to it
      if (data.url.includes('accounts.google.com')) {
        console.log('Redirecting to Google logout:', data.url);
        window.location.href = data.url;
        return;
      }
      
      // If we get /login, it means no idToken, so do regular logout
      if (data.url === '/login') {
        console.log('No idToken found, using regular signOut');
        await signOut({ callbackUrl: '/login' });
        return;
      }
      
      // If we get any other URL (like / for no session), do regular logout
      if (data.reason === 'no_session' || data.reason === 'no_id_token') {
        console.log('Session issue detected, using regular signOut:', data.reason);
        await signOut({ callbackUrl: '/login' });
        return;
      }
    }
  } catch (error) {
    console.error('Federated logout error:', error);
  }
  
  // Fallback: use regular NextAuth signOut
  console.log('Falling back to regular signOut');
  try {
    await signOut({ callbackUrl: '/login' });
  } catch (signOutError) {
    console.error('SignOut error:', signOutError);
    // Ultimate fallback: redirect to login
    console.log('Ultimate fallback: redirecting to login');
    window.location.href = '/login';
  }
}
