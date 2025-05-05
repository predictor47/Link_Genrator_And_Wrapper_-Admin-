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
  '/completion/' // Completion route (public-facing)
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
  const { pathname, host, protocol } = request.nextUrl;

  console.log(`Middleware processing: ${pathname} on host: ${host}`);
  
  // For local development
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  // For Amplify preview environments
  const isAmplifyDomain = host.includes('amplifyapp.com');
  
  // Check if we're on the admin subdomain
  const isAdminDomain = host === ADMIN_DOMAIN || 
                       (isLocalhost && pathname.startsWith('/admin'));
  
  // Check if we're on the main domain
  const isMainDomain = host === MAIN_DOMAIN || 
                       isLocalhost || 
                       isAmplifyDomain;

  // When in production (not localhost/Amplify preview)
  if (!isLocalhost && !isAmplifyDomain) {
    // Process admin subdomain requests
    if (isAdminDomain) {
      // If accessing root of admin domain, redirect to admin dashboard
      if (pathname === '/') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      
      // If accessing admin paths without the /admin prefix, add it
      if (!pathname.startsWith('/admin') && !pathname.startsWith('/_next/') && pathname !== '/favicon.ico') {
        return NextResponse.redirect(new URL(`/admin${pathname}`, request.url));
      }
    }
    
    // Process main domain requests accessing admin section
    if (isMainDomain && pathname.startsWith('/admin')) {
      // On main domain trying to access admin, redirect to admin subdomain
      const url = new URL(request.url);
      url.host = ADMIN_DOMAIN;
      return NextResponse.redirect(url);
    }
  }
  
  // Always allow access to Next.js static assets and favicon
  if (pathname.startsWith('/_next/') || pathname === '/favicon.ico') {
    const response = NextResponse.next();
    return applySecurityHeaders(response, false);
  }
  
  // Check if this is an admin route
  const isAdminRoute = pathname.startsWith('/admin') || isAdminDomain;
  
  // If not an admin route, allow access (public-facing routes)
  if (!isAdminRoute) {
    console.log(`Non-admin route: ${pathname} - allowing access`);
    const response = NextResponse.next();
    return applySecurityHeaders(response, false);
  }
  
  // At this point, we know it's an admin route
  console.log(`Admin route detected: ${pathname}`);
  
  // Check if the admin path is public (auth-related paths)
  if (isPublicPath(pathname)) {
    console.log(`Public admin path: ${pathname} - allowing access`);
    const response = NextResponse.next();
    return applySecurityHeaders(response, true);
  }
  
  // This is a protected admin route - check for authentication
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