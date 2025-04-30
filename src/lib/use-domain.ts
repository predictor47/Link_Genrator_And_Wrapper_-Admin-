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