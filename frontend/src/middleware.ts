import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect old onboarding routes to new onboarding-v2 routes
  if (pathname.startsWith('/onboarding')) {
    // Handle exact /onboarding path
    if (pathname === '/onboarding') {
      return NextResponse.redirect(new URL('/onboarding-v2', request.url));
    }
    
    // Handle onboarding sub-paths
    if (pathname.startsWith('/onboarding/')) {
      const subPath = pathname.replace('/onboarding/', '');
      return NextResponse.redirect(new URL(`/onboarding-v2/${subPath}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/onboarding',
    '/onboarding/:path*',
    // Exclude API routes and static files
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
};
