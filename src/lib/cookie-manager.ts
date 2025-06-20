/**
 * Cookie manager utility for handling authentication cookies
 */

// Get a cookie by name
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
    ?.split('=')[1];
  
  return cookieValue ? decodeURIComponent(cookieValue) : null;
}

// Set a cookie with domain and expiration
export function setCookie(name: string, value: string, options: {
  days?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
} = {}): void {
  if (typeof document === 'undefined') return;
  
  const {
    days = 7,
    path = '/',
    domain,
    secure = true,
    sameSite = 'lax'
  } = options;
  
  // Calculate expiration
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  // Build the cookie string
  let cookieString = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=${path}`;
  
  if (domain) {
    cookieString += `; domain=${domain}`;
  }
  
  if (secure) {
    cookieString += '; secure';
  }
  
  cookieString += `; samesite=${sameSite}`;
  
  document.cookie = cookieString;
}

// Delete a cookie
export function deleteCookie(name: string, options: {
  path?: string;
  domain?: string;
} = {}): void {
  if (typeof document === 'undefined') return;
  
  const { path = '/', domain } = options;
  
  // Set expiration to the past to delete
  let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
  
  if (domain) {
    cookieString += `; domain=${domain}`;
  }
  
  document.cookie = cookieString;
}

// Get current domain for cookie operations
export function getCookieDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  
  const hostname = window.location.hostname;
  
  // Don't set domain for localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return undefined;
  }
  
  // For amplifyapp.com domain, use the full hostname
  if (hostname.includes('amplifyapp.com')) {
    return hostname;
  }
  
  // For custom domains, use the domain itself (no need to handle subdomains anymore)
  return hostname;
}

// Clear all cookies related to authentication
export function clearAuthCookies(): void {
  if (typeof document === 'undefined') return;
  
  const domain = getCookieDomain();
  
  // Common authentication-related cookies
  const authCookies = [
    'amplify-signin-with-hostedUI',
    'amplify-redirected-from-hosted-ui',
    'amplify.auth.tokens',
    'CognitoIdentityServiceProvider.*',
    'amazon-cognito-advanced-security-data',
    'aws.cognito.*',
    'idToken',
    'accessToken',
    'refreshToken',
    'auth_tokens',
    'CognitoIdentityServiceProvider.*',
    'Authorization'
  ];
  
  // Delete all authentication cookies
  authCookies.forEach(cookieName => {
    if (cookieName.includes('*')) {
      // For pattern cookies, we need to find all matches
      document.cookie.split(';').forEach(cookie => {
        const name = cookie.split('=')[0].trim();
        if (name.includes(cookieName.replace('*', ''))) {
          deleteCookie(name, { domain });
          // Also try with no domain to catch all
          deleteCookie(name);
        }
      });
    } else {
      deleteCookie(cookieName, { domain });
      // Also try with no domain to catch all
      deleteCookie(cookieName);
    }
  });
  
  // Reset redirect count
  setCookie('redirect_count', '0', { days: 1 });
  
  console.log('All authentication cookies cleared');
}

// Fix any problem cookies that might be causing redirect loops
export function fixProblemCookies(): void {
  if (typeof document === 'undefined') return;
  
  // Reset redirect count to prevent loop detection from blocking legitimate redirects
  setCookie('redirect_count', '0', { days: 1 });
  
  // Check for auth-related cookies with incorrect settings
  const authHeaderCookie = getCookie('Authorization');
  if (authHeaderCookie) {
    // If auth is stored in a header cookie, it might be causing issues - clear it
    deleteCookie('Authorization');
  }
  
  // Get the current domain
  const hostname = window.location.hostname;
  
  // Try to fix auth cookies - first check if we can detect any bad ones
  const cookiesToCheck = [
    'amplify-signin-with-hostedUI',
    'amplify-redirected-from-hosted-ui',
    'idToken',
    'accessToken',
    'refreshToken'
  ];
  
  // Log cookie state for debugging
  console.log('Checking cookies state...');
  
  // Check each cookie and fix if needed
  let problemFound = false;
  cookiesToCheck.forEach(cookieName => {
    const cookieValue = getCookie(cookieName);
    if (cookieValue) {
      console.log(`Found potentially problematic cookie: ${cookieName}`);
      problemFound = true;
      
      // Delete the cookie and set again with correct domain
      deleteCookie(cookieName);
      deleteCookie(cookieName, { domain: hostname });
    }
  });
  
  // If we found problems, attempt a more thorough cleanup
  if (problemFound) {
    console.log('Performing thorough cookie cleanup');
    clearAuthCookies();
  }
  
  // Check for any infinite redirect related query params
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    const hasRedirectLoopParam = url.searchParams.has('redirect_loop') ||
                                url.searchParams.has('error') &&
                                url.searchParams.get('error')?.includes('redirect');
    
    if (hasRedirectLoopParam) {
      // Clear all auth cookies if we detect redirect loop parameters
      clearAuthCookies();
      
      // Remove the query parameters
      url.searchParams.delete('redirect_loop');
      url.searchParams.delete('error');
      
      // Update the URL without the query parameters
      window.history.replaceState({}, '', url.toString());
    }
  }
}

// Initialize cookie fixes when the page loads
export function initCookieFixes(): void {
  if (typeof window === 'undefined') return;
  
  // Function to run when the page loads
  const fixCookiesOnLoad = () => {
    // Reset redirect count and fix any other problem cookies
    fixProblemCookies();
    
    // Check the URL for signs of redirect loop
    if (window.location.href.includes('ERR_TOO_MANY_REDIRECTS') || 
        window.location.href.includes('error=redirect_loop')) {
      // If there's a redirect loop indication, clear all auth cookies
      console.log('Detected redirect loop, clearing all authentication cookies');
      clearAuthCookies();
      
      // Reload the page to break the loop
      window.location.href = window.location.origin + '/admin/login?fixed=true';
    }
    
    // Check if there's a fixed=true parameter to handle a previously detected redirect loop
    if (window.location.href.includes('fixed=true')) {
      console.log('Fixed parameter detected, clearing all authentication cookies again');
      // Double check that all cookies are cleared
      clearAuthCookies();
    }
  };
  
  // Run fixes when DOM content is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixCookiesOnLoad);
  } else {
    // DOM already loaded, run immediately
    fixCookiesOnLoad();
  }
}
