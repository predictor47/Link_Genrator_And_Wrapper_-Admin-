/**
 * Helper functions for the diagnostics page
 */

import { clearAuthCookies, fixProblemCookies, getCookieDomain } from './cookie-manager';

/**
 * Check if current URL indicates a redirect loop
 */
export function detectRedirectLoop(query: any): boolean {
  return (
    query.redirect_loop === 'true' ||
    query.fixed === 'true' ||
    query.error?.includes('redirect') ||
    query.error?.includes('loop')
  );
}

/**
 * Check if authentication cookies are present
 */
export function checkForAuthCookies(cookies: Record<string, any>): boolean {
  return Object.keys(cookies).some(key => 
    key.includes('Token') || 
    key.includes('token') ||
    key.includes('Cognito') || 
    key.includes('cognito') ||
    key.includes('aws') || 
    key.includes('Auth')
  );
}

/**
 * Diagnostic action: clear authentication cookies
 */
export function runCookieClearDiagnostic(): void {
  if (typeof window === 'undefined') return;
  
  clearAuthCookies();
  window.sessionStorage.setItem('redirect_count', '0');
}

/**
 * Diagnostic action: fix problem cookies
 */
export function runCookieFixDiagnostic(): void {
  if (typeof window === 'undefined') return;
  
  fixProblemCookies();
}

/**
 * Get cookie domain info for diagnostics
 */
export function getCookieDomainInfo(): {
  domain: string;
  isLocalhost: boolean;
  isAmplifyDomain: boolean;
  isCustomDomain: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      domain: 'server-side',
      isLocalhost: false,
      isAmplifyDomain: false,
      isCustomDomain: false
    };
  }
  
  const hostname = window.location.hostname;
  return {
    domain: getCookieDomain() || 'not-set',
    isLocalhost: hostname === 'localhost' || hostname.startsWith('127.0.0.1'),
    isAmplifyDomain: hostname.includes('amplifyapp.com'),
    isCustomDomain: !hostname.includes('localhost') && 
                   !hostname.startsWith('127.0.0.1') && 
                   !hostname.includes('amplifyapp.com')
  };
}
