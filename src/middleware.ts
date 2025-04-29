import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define allowed admin subdomains
const ADMIN_SUBDOMAINS = ['admin', 'dashboard'];

// Define environments where security may be relaxed (for dev/testing)
const DEV_ENVIRONMENTS = ['development', 'test'];

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
  
  // Only allow access to admin routes from admin subdomains
  if (isAdminRoute && !isAdminSubdomain && !isDevEnvironment) {
    // Redirect to home page or return 404 to mask the admin existence
    return NextResponse.redirect(new URL('/', request.url));
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