import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

// Define admin paths that need protection
const ADMIN_PATHS = ['/admin'];

// Public paths that don't require authentication
// Only include authentication-related paths and non-admin paths
const PUBLIC_PATHS = [
  '/admin/login',
  '/admin/signup',
  '/admin/verify',
  '/admin/forgot-password',
  '/',
  '/favicon.ico',
  '/_next/',  // Next.js static assets
  '/s/',       // Short link route (public-facing)
  '/survey/',  // Survey link route (public-facing)
  '/completion/', // Completion route (public-facing)
  '/sorry-quota-full',
  '/sorry-disqualified',
  '/thank-you-completed'
];

// Domain configuration
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com';
const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || `admin.${MAIN_DOMAIN}`;

// Cognito User Pool ID
const COGNITO_USER_POOL_ID = 'us-east-1_QIwwMdokt';

/**
 * Apply security headers to the response
 */
function applySecurityHeaders(response: NextResponse, isAdminRoute: boolean): NextResponse {
  // Define security headers
  const securityHeaders = {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // XSS Protection header (legacy browsers)
    'X-XSS-Protection': '1; mode=block',
    
    // Disable client-side caching for sensitive areas
    'Cache-Control': isAdminRoute ? 'no-store, max-age=0' : 'public, max-age=300',
    
    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
  
  // Apply headers to response
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Validate the JWT token from Cognito
 * @param token JWT token to validate
 * @returns boolean indicating if token is valid
 */
function validateToken(token: string): boolean {
  try {
    // Basic format check
    if (!token || !token.includes('.')) {
      console.log('Invalid token format');
      return false;
    }

    // Decode the token
    const decodedToken = jwtDecode<any>(token);
    
    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (!decodedToken.exp || decodedToken.exp < currentTime) {
      console.log('Token expired');
      return false;
    }
    
    // Check if the token was issued by our Cognito User Pool
    if (decodedToken.iss !== `https://cognito-idp.us-east-1.amazonaws.com/${COGNITO_USER_POOL_ID}`) {
      console.log('Token issuer mismatch');
      return false;
    }
    
    // Token is valid
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

/**
 * Check if a path is public (doesn't require authentication)
 */
function isPublicPath(pathname: string): boolean {
  // Check exact matches first
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }
  
  // Check auth routes first since they must remain accessible
  const authRoutes = ['/admin/login', '/admin/signup', '/admin/verify', '/admin/forgot-password'];
  if (authRoutes.some(route => pathname === route)) {
    return true;
  }
  
  // Check path prefixes
  return PUBLIC_PATHS.some(publicPath => 
    pathname.startsWith(publicPath) && 
    // Ensure we don't accidentally match admin paths that should be protected
    !(pathname.startsWith('/admin') && 
      !pathname.startsWith('/admin/login') && 
      !pathname.startsWith('/admin/signup') && 
      !pathname.startsWith('/admin/verify') && 
      !pathname.startsWith('/admin/forgot-password'))
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, host } = request.nextUrl;

  console.log(`Middleware processing: ${pathname} on host: ${host}`);
  
  // For local development
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  // For Amplify preview environments
  const isAmplifyDomain = host.includes('amplifyapp.com');
  
  // Check if we're on the admin subdomain
  const isAdminDomain = host === ADMIN_DOMAIN || 
                       (isLocalhost && pathname.startsWith('/admin')) ||
                       (isAmplifyDomain && pathname.startsWith('/admin'));

  // Always allow access to Next.js static assets and favicon
  if (pathname.startsWith('/_next/') || pathname === '/favicon.ico') {
    const response = NextResponse.next();
    return applySecurityHeaders(response, false);
  }
  
  // Special handling for authentication routes - always allow
  if (['/admin/login', '/admin/signup', '/admin/verify', '/admin/forgot-password'].some(route => pathname === route)) {
    console.log(`Auth route detected: ${pathname} - allowing access`);
    const response = NextResponse.next();
    return applySecurityHeaders(response, true);
  }
  
  // Handle outcome pages - always allow
  if (['/sorry-quota-full', '/sorry-disqualified', '/thank-you-completed'].some(path => pathname === path)) {
    const response = NextResponse.next();
    return applySecurityHeaders(response, false);
  }

  // When in production (not localhost/Amplify preview)
  if (!isLocalhost && !isAmplifyDomain) {
    // Correctly handle admin subdomain root
    if (isAdminDomain && pathname === '/') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    
    // Handle admin login pages directly on subdomain without /admin prefix
    // This is critical for the login page to work on admin.domain.com/login
    if (isAdminDomain && 
        (pathname === '/login' || 
         pathname === '/signup' || 
         pathname === '/verify' || 
         pathname === '/forgot-password')) {
      return NextResponse.redirect(new URL(`/admin${pathname}`, request.url));
    }

    // Process main domain requests accessing admin section
    if (host === MAIN_DOMAIN && pathname.startsWith('/admin')) {
      // On main domain trying to access admin, redirect to admin subdomain
      const url = new URL(request.url);
      url.host = ADMIN_DOMAIN;
      return NextResponse.redirect(url);
    }
  }

  // Check if this is an admin route
  const isAdminRoute = pathname.startsWith('/admin') || isAdminDomain;
  
  // If not an admin route, allow access (public-facing routes)
  if (!isAdminRoute) {
    console.log(`Non-admin route: ${pathname} - allowing access`);
    const response = NextResponse.next();
    return applySecurityHeaders(response, false);
  }
  
  console.log(`Admin route detected: ${pathname}`);
  
  // Check if the admin path is public (auth-related paths)
  if (isPublicPath(pathname)) {
    console.log(`Public admin path: ${pathname} - allowing access`);
    const response = NextResponse.next();
    return applySecurityHeaders(response, true);
  }
  
  // For protected admin routes - check for authentication
  console.log('Protected admin route - checking auth');
  
  // Check for authentication token
  const authToken = request.cookies.get('idToken')?.value;
  
  // If no token found or token is invalid, redirect to login
  if (!authToken || !validateToken(authToken)) {
    console.log('Not authenticated or invalid token - redirecting to login');
    const returnUrl = encodeURIComponent(pathname);
    const response = NextResponse.redirect(new URL(`/admin/login?redirect=${returnUrl}`, request.url));
    return applySecurityHeaders(response, true);
  }
  
  // User is authenticated with a valid token, allow access to the admin route
  console.log('Valid authentication - allowing access to admin route');
  const response = NextResponse.next();
  return applySecurityHeaders(response, true);
}

// Configure matchers to run middleware on all paths
export const config = {
  matcher: [
    // Match all paths for proper routing
    '/(.*)',
  ],
};