import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define allowed admin subdomains
const ADMIN_SUBDOMAINS = ['admin', 'dashboard'];

// Define environments where security may be relaxed (for dev/testing)
const DEV_ENVIRONMENTS = ['development', 'test'];

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

export function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  // Check if this is an admin route
  const isAdminRoute = pathname.startsWith('/admin');
  
  // Parse the hostname to get subdomain
  const hostParts = hostname.split('.');
  let subdomain: string | null = null;
  
  // For localhost development, handle special case
  if (hostname === 'localhost') {
    // Skip subdomain check for local development
    subdomain = 'admin'; // Assume it's admin for local dev
  }
  // Handle regular domain with potential subdomains
  else if (hostParts.length > 2) {
    subdomain = hostParts[0];
  }
  
  const isAdminSubdomain = ADMIN_SUBDOMAINS.includes(subdomain || '');
  const isDevEnvironment = DEV_ENVIRONMENTS.includes(process.env.NODE_ENV || '');
  
  // Check if path is public
  const isPublicPath = PUBLIC_PATHS.some(publicPath => 
    pathname === publicPath || 
    pathname.startsWith(publicPath + '/') ||
    pathname.match(/^\/s\/[^\/]+\/[^\/]+$/) ||  // Match /s/[projectId]/[uid]
    pathname.match(/^\/survey\/[^\/]+\/[^\/]+$/) || // Match /survey/[projectId]/[uid]
    pathname.match(/^\/completion\/[^\/]+\/[^\/]+$/) // Match /completion/[projectId]/[uid]
  );
  
  // Check for authentication
  const authToken = request.cookies.get('idToken')?.value;
  const isAuthenticated = !!authToken;

  // Only allow access to admin routes from admin subdomains
  if (isAdminRoute && !isAdminSubdomain && !isDevEnvironment) {
    // Redirect to home page or return 404 to mask the admin existence
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Require authentication for admin routes except public ones
  if (isAdminRoute && !isPublicPath && !isAuthenticated) {
    // Redirect to login page
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Check for API routes that should be protected
  if (pathname.startsWith('/api/') && (
      pathname.includes('/admin/') ||
      pathname.startsWith('/api/projects/') ||
      pathname.startsWith('/api/vendors/')
    ) && !isAdminSubdomain && !isDevEnvironment) {
    // Return 404 for unauthorized API access
    return new NextResponse(
      JSON.stringify({ success: false, message: 'Not Found' }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  return NextResponse.next();
}

// Configure matchers to run middleware only on specific paths
export const config = {
  matcher: [
    // Match all admin paths and API paths (except for links/* and verify/*)
    '/admin/:path*',
    '/api/projects/:path*',
    '/api/vendors/:path*',
    '/api/admin/:path*',
  ],
};