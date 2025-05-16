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
  '/api/',    // API routes
  '/assets/', // Static assets
  '/s/',       // Short link route (public-facing)
  '/survey/',  // Survey link route (public-facing)
  '/completion/', // Completion route (public-facing)
  '/sorry-quota-full',
  '/sorry-disqualified',
  '/thank-you-completed',
  '/amplify_outputs.json' // Allow access to amplify outputs for configuration
];

// Domain configuration
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com';
const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || `admin.${MAIN_DOMAIN}`;

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

// Update the isAdminRoute function to properly handle login paths
function isAdminRoute(pathname: string): boolean {
  // Admin routes start with /admin, but exclude login-related routes to prevent loops
  return pathname.startsWith('/admin') && 
    !pathname.includes('/admin/login') && 
    !pathname.includes('/api/auth');
}

// Update the middleware handler function
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  
  // Special case for diagnostics page - always allow access
  if (pathname === '/diagnostics') {
    return NextResponse.next();
  }
  
  // Check if we're on the admin domain
  const isAdminDomain = hostname.startsWith('admin.');
  
  // Log request details to help debug
  console.log(`Middleware processing: ${pathname} on host: ${hostname}`);
  
  // If we're on admin domain
  if (isAdminDomain) {
    console.log('Admin domain detected');
    
    // Handle login page specifically - always allow access
    if (pathname.includes('/login') || pathname === '/') {
      console.log('Auth route detected: allowing access to login');
      return NextResponse.next();
    }
    
    // Other admin routes need authentication
    if (isAdminRoute(pathname)) {
      console.log('Protected admin route - checking auth');
      
      // Check token - add token validation logic here
      // ...
      
      // For now, just continue
      return NextResponse.next();
    }
    
    // Prevent access to non-admin routes on admin domain
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/api')) {
      console.log('Redirecting to admin route');
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }
  
  return NextResponse.next();
}

// Configure matchers to run middleware on all paths
export const config = {
  matcher: [
    // Match all paths for proper routing
    '/(.*)',
  ],
};