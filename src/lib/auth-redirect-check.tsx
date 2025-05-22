import { useEffect, ReactNode, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './auth';
import { logAuthDiagnostics } from './auth-debug';

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
  const { isAuthenticated, isLoading, refreshAuthState } = useAuth();
  const router = useRouter();
  const { redirect, fixed } = router.query;
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Force a refresh of auth state on component mount
    refreshAuthState();
    console.log('Auth state refreshed, current state:', { isAuthenticated, isLoading });
  }, [refreshAuthState]);

  useEffect(() => {
    // Only redirect if authenticated, not loading, and not already redirecting
    if (isAuthenticated && !isLoading && !redirect && fixed !== 'true' && !isRedirecting) {
      console.log('User already authenticated, redirecting to dashboard');
      setIsRedirecting(true);
      
      // Log diagnostics before redirecting
      logAuthDiagnostics().then(() => {
        // Add a short delay to ensure state has time to be fully established
        setTimeout(() => {
          // Use hard navigation instead of router.replace for more reliable redirect
          window.location.href = redirectTo;
        }, 1000);
      });
    }
  }, [isAuthenticated, isLoading, redirect, fixed, redirectTo, router, isRedirecting]);

  // If redirecting, show a simple loading message
  if (isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>You are already signed in. Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // Otherwise render children - this allows login forms to appear while checking auth
  return <>{children}</>;
}
