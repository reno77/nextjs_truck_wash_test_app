import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // If user is not logged in, redirect to login
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Role-based access control
    const role = token.role as string;

    // Root path redirect based on role
    if (path === '/') {
      switch (role) {
        case 'manager':
          return NextResponse.redirect(new URL('/manager/dashboard', req.url));
        case 'washer':
          return NextResponse.redirect(new URL('/washer/washes', req.url));
        case 'driver':
          return NextResponse.redirect(new URL('/driver/dashboard', req.url));
        default:
          return NextResponse.redirect(new URL('/login', req.url));
      }
    }

    // Manager routes
    if (path.startsWith('/manager') && role !== 'manager') {
      if (role === 'washer') {
        return NextResponse.redirect(new URL('/washer/washes', req.url));
      } else if (role === 'driver') {
        return NextResponse.redirect(new URL('/driver/dashboard', req.url));
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Washer routes
    if (path.startsWith('/washer') && role !== 'washer') {
      if (role === 'manager') {
        return NextResponse.redirect(new URL('/manager/dashboard', req.url));
      } else if (role === 'driver') {
        return NextResponse.redirect(new URL('/driver/dashboard', req.url));
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Driver routes
    if (path.startsWith('/driver') && role !== 'driver') {
      if (role === 'manager') {
        return NextResponse.redirect(new URL('/manager/dashboard', req.url));
      } else if (role === 'washer') {
        return NextResponse.redirect(new URL('/washer/washes', req.url));
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Protect these routes
export const config = {
  matcher: ['/', '/manager/:path*', '/washer/:path*', '/driver/:path*'],
};
