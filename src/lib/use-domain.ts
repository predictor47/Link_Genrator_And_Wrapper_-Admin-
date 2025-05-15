import { useRouter } from 'next/router';

type DomainInfo = {
  isAdminDomain: boolean;
  isMainDomain: boolean;
  domain: string;
  adminDomain: string;
  mainDomain: string;
  isLocalhost: boolean;
  isAmplifyPreview: boolean;
};

/**
 * Custom hook for managing domain-specific configuration
 * 
 * Provides information about the current domain environment and utilities
 * for working with domain-specific routes
 */
export const useDomain = (): DomainInfo => {
  const router = useRouter();
  
  // Get domain configuration
  const mainDomain = process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com';
  const adminDomain = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || `admin.${mainDomain}`;
  
  // Check what kind of domain we're on (in client-side code)
  let currentHost = '';
  let isLocalhost = false;
  let isAmplifyPreview = false;
  
  if (typeof window !== 'undefined') {
    currentHost = window.location.hostname;
    isLocalhost = currentHost.includes('localhost') || currentHost.includes('127.0.0.1');
    isAmplifyPreview = currentHost.includes('amplifyapp.com');
  }
  
  // Determine domain status
  let isAdminDomain = currentHost === adminDomain;
  let isMainDomain = currentHost === mainDomain;
  
  // For development environments
  if (isLocalhost) {
    isAdminDomain = router.pathname.startsWith('/admin');
    isMainDomain = !isAdminDomain;
  } else if (isAmplifyPreview) {
    // In Amplify preview, check path to determine domain context
    isAdminDomain = router.pathname.startsWith('/admin');
    isMainDomain = !isAdminDomain;
  }
  
  // Use the actual domain for production, or localhost for development
  const domain = isLocalhost ? 'localhost:3000' : 
                 isAmplifyPreview ? currentHost :
                 isAdminDomain ? adminDomain : mainDomain;
  
  return {
    isAdminDomain,
    isMainDomain,
    domain,
    adminDomain,
    mainDomain,
    isLocalhost,
    isAmplifyPreview,
  };
};

export default useDomain;

/**
 * Check if a URL belongs to a specific domain
 */
export function isUrlFromDomain(url: string, domain: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes(domain);
  } catch {
    return false;
  }
}

/**
 * Determine survey status from redirect URL
 */
export function getSurveyStatusFromUrl(url: string): string {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    
    // Check for thank you page
    if (url.includes('/thank-you') || url.includes('/thankyou')) {
      return 'COMPLETED';
    }
    
    // Check for quota full page
    if (url.includes('/quota') || url.includes('/quota-full')) {
      return 'QUOTA_FULL';
    }
    
    // Check for disqualification page
    if (url.includes('/disqualified') || url.includes('/not-eligible') || url.includes('/screened')) {
      return 'DISQUALIFIED';
    }
    
    // Check for specific paths
    const path = urlObj.pathname.toLowerCase();
    if (path.includes('complete') || path.includes('finished') || path.includes('end')) {
      return 'COMPLETED';
    }
    
    return '';
  } catch {
    return '';
  }
}

/**
 * Create a monitoring function for a specific iframe element
 */
export function createIframeMonitor(
  iframe: HTMLIFrameElement, 
  onDomainChange: (domain: string, url: string) => void,
  options = { interval: 1000, maxChecks: 300 }
): () => void {
  let currentDomain = '';
  let checkCount = 0;
  let intervalId: NodeJS.Timeout;
  
  try {
    // Try to get initial domain
    const initialLocation = iframe.contentWindow?.location.href;
    if (initialLocation) {
      currentDomain = new URL(initialLocation).hostname;
    }
  } catch {
    // Cross-origin error, expected
  }
  
  // Start monitoring
  intervalId = setInterval(() => {
    checkCount++;
    try {
      const location = iframe.contentWindow?.location.href;
      if (location) {
        const newDomain = new URL(location).hostname;
        if (newDomain !== currentDomain) {
          currentDomain = newDomain;
          onDomainChange(newDomain, location);
        }
      }
    } catch {
      // Cross-origin error, expected when accessing iframe location
    }
    
    // Stop monitoring after maximum number of checks
    if (checkCount >= options.maxChecks) {
      clearInterval(intervalId);
    }
  }, options.interval);
  
  // Return a function to stop monitoring
  return () => clearInterval(intervalId);
}

/**
 * Listen for postMessage events from iframe
 * Some survey platforms may use postMessage to communicate completion
 */
export function listenForPostMessages(
  onMessage: (event: MessageEvent) => void,
  trustedOrigins: string[] = ['*']
): () => void {
  const messageHandler = (event: MessageEvent) => {
    // Check if origin is trusted
    if (trustedOrigins.includes('*') || trustedOrigins.includes(event.origin)) {
      onMessage(event);
    }
  };
  
  window.addEventListener('message', messageHandler);
  
  // Return function to remove listener
  return () => window.removeEventListener('message', messageHandler);
}