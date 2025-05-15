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
  const accessToken = request.cookies.get('accessToken')?.value;    // When in development mode with sandbox, be more flexible
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: Found tokens:', !!authToken, !!accessToken);
      // In sandbox mode, validate the token but be more flexible
    if (authToken || accessToken) {
      // Use the token we have - prefer idToken, fall back to accessToken
      const tokenToValidate = authToken || accessToken || '';
      
      console.log('Development mode: Checking auth token validity');
      if (validateToken(tokenToValidate)) {
        console.log('Development mode: Valid token - allowing access');
        const response = NextResponse.next();
        return applySecurityHeaders(response, true);
      } else {
        console.log('Development mode: Invalid token - redirecting to login');
      }
    }    // If the user is coming from the login page, check for redirect loop
    const referer = request.headers.get('referer') || '';
    if (referer.includes('/login') && pathname === '/admin') {
      console.log('Development mode - potential redirect loop from login page detected');
      // Just redirect to login rather than creating a fake token
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  } else {
    // For production, do the full validation
    if (authToken && validateToken(authToken)) {
      console.log('Valid authentication - allowing access to admin route');
      const response = NextResponse.next();
      return applySecurityHeaders(response, true);
    }
  }
    // If we get here, authentication failed
  console.log('Not authenticated or invalid token - redirecting to login');
    // Don't create redirect loops - if we're already on or coming from login page
  const referer = request.headers.get('referer') || '';
  if (referer.includes('/login') && pathname === '/admin') {
    console.log('Preventing redirect loop - user is coming from login page');
    
    // For sandbox testing, if we detect we're in a login loop in development mode
    // create a special sandbox session token that will bypass auth checks
    if (process.env.NODE_ENV === 'development' && (isLocalhost || isAmplifyDomain)) {
      console.log('Creating sandbox development token to break login loop');
      const response = NextResponse.next();
      response.cookies.set('idToken', 'dev-sandbox-token', { 
        path: '/', 
        maxAge: 3600,
        httpOnly: true,
        secure: !isLocalhost // Only use secure in non-localhost environments
      });
      return applySecurityHeaders(response, true);
    }
    
    const response = NextResponse.next();
    return applySecurityHeaders(response, true);
  }
  
  const returnUrl = encodeURIComponent(pathname);
  const loginUrl = new URL(`/admin/login?redirect=${returnUrl}`, request.url);
  const response = NextResponse.redirect(loginUrl);
  return applySecurityHeaders(response, true);
}

// Configure matchers to run middleware on all paths
export const config = {
  matcher: [
    // Match all paths for proper routing
    '/(.*)',
  ],
};