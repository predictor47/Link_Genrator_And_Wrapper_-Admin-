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
  const { redirect, fixed } = router.query;

  useEffect(() => {
    // Only redirect if authenticated, not loading, and not already redirecting
    if (isAuthenticated && !isLoading && !redirect && fixed !== 'true') {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isLoading, redirect, fixed, redirectTo, router]);

  // Always render children - this allows login forms to appear while checking auth
  return <>{children}</>;
}
