import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Federated logout - Session:', session); // Debug log
    
    if (!session) {
      console.log('No session found'); // Debug log
      return NextResponse.json({ url: '/', reason: 'no_session' });
    }
    
    if (!session.user.idToken) {
      console.log('No idToken found in session'); // Debug log
      // If no id_token, fall back to regular logout
      return NextResponse.json({ url: '/login', reason: 'no_id_token' });
    }

    // Construct Google's logout URL
    const googleLogoutUrl = new URL('https://accounts.google.com/logout');
    
    // Add the continue parameter to redirect back to our app after Google logout
    const postLogoutRedirectUri = `${process.env.NEXTAUTH_URL}/auth/signout-complete`;
    googleLogoutUrl.searchParams.set('continue', postLogoutRedirectUri);

    console.log('Redirecting to Google logout:', googleLogoutUrl.toString()); // Debug log
    return NextResponse.json({ url: googleLogoutUrl.toString() });
  } catch (error) {
    console.error('Federated logout error:', error);
    return NextResponse.json({ url: '/', reason: 'error' });
  }
}
