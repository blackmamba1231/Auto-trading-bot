import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that are API endpoints and need token verification
const protectedApiRoutes = ['/api/bot', '/api/bot-data', '/api/settings'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('Middleware processing path:', pathname);
  
  // Skip middleware for Next.js assets, public files, etc.
  if (
    pathname.startsWith('/_next') || 
    pathname.includes('favicon.ico') || 
    pathname.includes('robots.txt')
  ) {
    return NextResponse.next();
  }
  
  // Only check API routes that need token verification
  if (protectedApiRoutes.some(route => pathname.startsWith(route))) {
    console.log('Protected route detected:', pathname);
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid Authorization header');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // For simplicity, we'll just check if a token exists
    // In a real app, you would verify the token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.log('Empty token in Authorization header');
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    console.log('Valid token found, proceeding with request');
  }
  
  // For all other routes, let the client handle authentication
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only match API routes that need protection
    '/api/bot/:path*',
    '/api/bot-data/:path*',
    '/api/settings/:path*'
  ],
};
