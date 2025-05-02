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

// Domain configuration
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com';
const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || `admin.${MAIN_DOMAIN}`;

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
    
    // Content Security Policy - adjust as needed for your app
    'Content-Security-Policy': isAdminRoute 
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.amazonaws.com https://*.cloudflare.com https://*.amplifyapp.com;"
      : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.amazonaws.com https://*.cloudflare.com https://*.amplifyapp.com;",
    
    // Permissions policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
  
  // Apply headers to response
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// Validate token by making a request to the server or checking locally
async function validateToken(token: string): Promise<boolean> {
  try {
    // Since we're in middleware, we can't directly use AuthService methods that require browser APIs
    // Instead, make a simple fetch request to validate the token
    const response = await fetch('https://cognito-idp.us-east-1.amazonaws.com', {
      method: 'POST',
      headers: {
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.GetUser',
        'Content-Type': 'application/x-amz-json-1.1',
        'Authorization': `Bearer ${token}`
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, host, protocol } = request.nextUrl;
  
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
  
  // Check if this is the root path - always allow access to home page
  if (pathname === '/' || pathname.startsWith('/_next/') || pathname === '/favicon.ico') {
    const response = NextResponse.next();
    return applySecurityHeaders(response, false);
  }
  
  // Check if this is an admin route
  const isAdminRoute = ADMIN_PATHS.some(path => pathname.startsWith(path));
  
  if (!isAdminRoute) {
    // For non-admin routes, just proceed with security headers
    const response = NextResponse.next();
    return applySecurityHeaders(response, false);
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
    const response = NextResponse.next();
    return applySecurityHeaders(response, pathname.startsWith('/admin'));
  }
  
  // Check for authentication
  const authToken = request.cookies.get('idToken')?.value;
  
  // Enhanced authentication check - validate token existence first
  if (!authToken) {
    // No token found, redirect to login
    const returnUrl = encodeURIComponent(request.nextUrl.pathname);
    const response = NextResponse.redirect(new URL(`/admin/login?redirect=${returnUrl}`, request.url));
    return applySecurityHeaders(response, true);
  }
  
  // For performance reasons, we'll do a very basic JWT validation check
  // This doesn't do full validation but prevents the most obvious misuse
  try {
    // Check if token is properly formatted as a JWT token
    const parts = authToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    // Check if token is expired by decoding the payload part
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }
    
    // Token passed basic checks, continue to the requested page
    const response = NextResponse.next();
    return applySecurityHeaders(response, true);
    
  } catch (error) {
    // Invalid token, redirect to login
    console.error('Token validation failed:', error);
    const returnUrl = encodeURIComponent(request.nextUrl.pathname);
    const response = NextResponse.redirect(new URL(`/admin/login?redirect=${returnUrl}`, request.url));
    return applySecurityHeaders(response, true);
  }
}

// Configure matchers to run middleware only on specific paths
export const config = {
  matcher: [
    // Match all paths for proper routing
    '/(.*)',
  ],
};