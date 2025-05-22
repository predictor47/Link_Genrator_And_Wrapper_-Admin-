import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './auth';

interface AuthRedirectCheckProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * AuthRedirectCheck component for login/signup pages
 * If the user is already authenticated, they will be redirected to the admin dashboard
 */
export default function AuthRedirectCheck({ 
  children, 
  redirectTo = '/admin' 
}: AuthRedirectCheckProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { redirect, fixed } = router.query; // 'redirect' is the intended destination after login

  useEffect(() => {
    // If the user is authenticated and we are not in a 'fixed' state (after cookie clearing)
    // and the current page is a login/signup type page that AuthRedirectCheck is used on.
    if (isAuthenticated && !isLoading && fixed !== 'true') {
      // Determine the target URL:
      // 1. If a 'redirect' query param exists (e.g., user was sent to login from a protected page), use that.
      // 2. Otherwise, use the default 'redirectTo' prop (usually '/admin').
      const targetUrl = typeof redirect === 'string' && redirect ? redirect : redirectTo;
      
      // Prevent redirecting to the login page itself if that's somehow the targetUrl
      if (router.pathname !== targetUrl) {
        console.log(`AuthRedirectCheck: User authenticated, redirecting to ${targetUrl}`);
        router.replace(targetUrl);
      }
    }
  }, [isAuthenticated, isLoading, redirect, fixed, redirectTo, router]);

  // Render children (e.g., the login form) if not redirecting or if still loading auth state.
  // This allows the login page to be displayed initially.
  return <>{children}</>;
}
