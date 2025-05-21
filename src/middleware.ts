import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

// Next.js automatically inlines environment variables for Edge Runtime
// For development type safety, declare the global process
declare const process: {
  env: {
    NODE_ENV: 'development' | 'production' | 'test';
    NEXT_PUBLIC_DOMAIN?: string;
  }
};

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
  '/public/',  // Public assets
  '/api/',    // API routes
  '/assets/', // Static assets
  '/s/',       // Short link route (public-facing)
  '/survey/',  // Survey link route (public-facing)
  '/completion/', // Completion route (public-facing)
  '/sorry-quota-full',
  '/sorry-disqualified',
  '/thank-you-completed',
  '/diagnostics',
  '/amplify_outputs.json' // Allow access to amplify outputs for configuration
];

// Domain configuration
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com';

// Cognito User Pool ID - will be auto-detected in development mode
const COGNITO_USER_POOL_ID = process.env.NODE_ENV === 'development' 
  ? 'us-east-1_SANDBOX' // This will be overridden by the validation logic
  : 'us-east-1_QIwwMdokt';

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
    // No more special case for a development sandbox token
    // We need to let Amplify handle the real tokens

    // Basic format check
    if (!token || !token.includes('.')) {
      console.log('Invalid token format');
      return false;
    }

    // Decode the token
    const decodedToken = jwtDecode<any>(token);
    console.log('Token decoded:', { sub: decodedToken.sub, exp: decodedToken.exp, iss: decodedToken.iss });
    
    // Check token expiration - allow expired tokens in development
    const currentTime = Math.floor(Date.now() / 1000);
    if (!decodedToken.exp) {
      console.log('Token missing expiration');
      if (process.env.NODE_ENV === 'development') {
        // Allow tokens without expiration in development
        console.log('Token missing expiration but allowing in development mode');
      } else {
        return false;
      }
    }
    
    if (decodedToken.exp && decodedToken.exp < currentTime) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Token expired but allowing in development mode');
      } else {
        console.log('Token expired');
        return false;
      }
    }
    
    // In development/sandbox environment, be more flexible with issuer validation
    if (process.env.NODE_ENV === 'development') {
      // For sandbox, check if the token has typical JWT fields or allow any valid JWT
      console.log('Development mode: Simplified token validation');
      return true;
    }
    // In production, check the exact issuer
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
      if (decodedToken.iss !== `https://cognito-idp.us-east-1.amazonaws.com/${COGNITO_USER_POOL_ID}`) {
        console.log('Token issuer mismatch');
        return false;
      }
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
  
  // Always allow access to authentication and public routes
  const authRoutes = ['/admin/login', '/admin/signup', '/admin/verify', '/admin/forgot-password'];
  if (authRoutes.some(route => pathname === route)) {
    return true;
  }
  
  // Check path prefixes for static assets and public paths
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

// Update the isAdminRoute function to properly handle login paths
function isAdminRoute(pathname: string): boolean {
  // Admin routes start with /admin, but exclude login-related routes to prevent loops
  return pathname.startsWith('/admin') && 
    !pathname.includes('/admin/login') && 
    !pathname.includes('/admin/signup') &&
    !pathname.includes('/admin/verify') &&
    !pathname.includes('/admin/forgot-password') &&
    !pathname.includes('/api/auth');
}

// Update the middleware handler function
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  
  // Always allow access to diagnostics page - useful for debugging
  if (pathname === '/diagnostics') {
    console.log('Allowing access to diagnostics page');
    return NextResponse.next();
  }
  
  // Log request details to help debug
  console.log(`Middleware processing: ${pathname} on host: ${hostname}`);
  
  // Add redirect count to help debug redirect loops
  const redirectCount = request.cookies.get('redirect_count');
  let count = redirectCount ? parseInt(redirectCount.value, 10) : 0;
  count++;
  
  // Always clear redirect count cookie for login routes
  if (pathname === '/admin/login') {
    const response = NextResponse.next();
    response.cookies.set('redirect_count', '0', {
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
    console.log('On login page, resetting redirect count');
    return response;
  }
  
  // If count gets too high, we're probably in a loop - allow the request through
  if (count > 5) {
    console.log('Detected potential redirect loop (count: ' + count + ') - allowing request');
    const response = NextResponse.next();
    response.cookies.set('redirect_count', '0', {
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
    return response;
  }
  
  // Store the updated redirect count
  const response = NextResponse.next();
  response.cookies.set('redirect_count', count.toString(), {
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
  
  // Handle public paths - no auth needed
  if (isPublicPath(pathname)) {
    console.log(`Public path detected [${pathname}]: allowing access`);
    return applySecurityHeaders(response, false);
  }
  
  // If this is an admin route, we need to check authentication (works on any domain)
  if (isAdminRoute(pathname)) {
    console.log('Protected admin route - checking auth');
    
    // Check for authentication token in cookies
    const authCookie = request.cookies.get('idToken')?.value;
    const accessToken = request.cookies.get('accessToken')?.value;
    
    // If no token found, redirect to login
    if (!authCookie && !accessToken) {
      console.log('No auth token found - redirecting to login');
      
      // Create a login URL with proper redirect parameter
      const url = new URL('/admin/login', request.url);
      
      // Only add redirect if it's not already the login page to avoid loops
      if (pathname !== '/admin/login') {
        url.searchParams.set('redirect', pathname);
      }
      
      const redirectResponse = NextResponse.redirect(url);
      
      // Update redirect count
      redirectResponse.cookies.set('redirect_count', count.toString(), {
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });
      
      return applySecurityHeaders(redirectResponse, true);
    }

    // Use the first available token
    const token = authCookie || accessToken || '';
    
    // If token is invalid or empty, redirect to login
    if (!token || !validateToken(token)) {
      console.log('Invalid token - redirecting to login');
      
      // Redirect to login page with return URL
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('redirect', pathname);
      
      const redirectResponse = NextResponse.redirect(url);
      
      // Clear invalid token
      redirectResponse.cookies.delete('idToken');
      redirectResponse.cookies.delete('accessToken');
      
      return applySecurityHeaders(redirectResponse, true);
    }
    
    // Token is valid, allow access to admin routes
    console.log('Valid token found - allowing admin access');
    return applySecurityHeaders(response, true);
  }
  
  // Default: apply security headers and continue
  return applySecurityHeaders(response, pathname.startsWith('/admin'));
}

// Configure matchers to run middleware on all paths
export const config = {
  matcher: [
    // Match all paths for proper routing
    '/(.*)',
  ],
};