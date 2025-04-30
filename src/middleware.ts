import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthService } from './lib/auth-service';

// Define admin paths that need protection
const ADMIN_PATHS = ['/admin'];

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/admin/login',
  '/admin/signup',
  '/admin/verify',
  '/admin/forgot-password',
  '/',
  '/s/',       // Short link route
  '/survey/',  // Survey link route
  '/completion/' // Completion route
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if this is the root path - always allow access to home page
  if (pathname === '/') {
    return NextResponse.next();
  }
  
  // Check if this is an admin route
  const isAdminRoute = ADMIN_PATHS.some(path => pathname.startsWith(path));
  
  if (!isAdminRoute) {
    // For non-admin routes, just proceed
    return NextResponse.next();
  }
  
  // Check if path is public (login, signup, etc.)
  const isPublicPath = PUBLIC_PATHS.some(publicPath => 
    pathname === publicPath || 
    pathname.startsWith(publicPath + '/') ||
    pathname.match(/^\/s\/[^\/]+\/[^\/]+$/) ||  // Match /s/[projectId]/[uid]
    pathname.match(/^\/survey\/[^\/]+\/[^\/]+$/) || // Match /survey/[projectId]/[uid]
    pathname.match(/^\/completion\/[^\/]+\/[^\/]+$/) // Match /completion/[projectId]/[uid]
  );
  
  // If it's a public path within admin routes (like /admin/login), allow access
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // Check for authentication
  const authToken = request.cookies.get('idToken')?.value;
  const isAuthenticated = !!authToken;

  // If not authenticated and trying to access protected admin route, redirect to login
  if (!isAuthenticated) {
    // Redirect to admin login page
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // User is authenticated, allow access to admin route
  return NextResponse.next();
}

// Configure matchers to run middleware only on specific paths
export const config = {
  matcher: [
    // Match all paths for proper routing
    '/(.*)',
  ],
};