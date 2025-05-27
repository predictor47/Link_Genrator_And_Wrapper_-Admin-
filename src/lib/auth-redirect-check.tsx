import { useEffect, ReactNode, useState } from 'react';
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
  const { isAuthenticated, isLoading, refreshAuthState } = useAuth();
  const router = useRouter();
  const [hasAttemptedRedirect, setHasAttemptedRedirect] = useState(false);

  useEffect(() => {
    // Force a refresh of auth state on component mount
    refreshAuthState();
    console.log('Auth state refreshed, current state:', { isAuthenticated, isLoading });
  }, [refreshAuthState]);

  useEffect(() => {
    // Debug logging
    console.log('AuthRedirectCheck effect triggered:', { 
      isAuthenticated, 
      isLoading, 
      hasAttemptedRedirect,
      redirectTo,
      currentPath: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
    });
    
    // Only attempt redirect once when user is authenticated and not loading
    if (isAuthenticated && !isLoading && !hasAttemptedRedirect) {
      console.log('User is authenticated, attempting redirect to:', redirectTo);
      setHasAttemptedRedirect(true);
      
      // Use immediate window location change for most reliable redirect
      setTimeout(() => {
        console.log('Executing redirect to:', redirectTo);
        window.location.replace(redirectTo);
      }, 100);
    }
  }, [isAuthenticated, isLoading, redirectTo, hasAttemptedRedirect]);

  // Show loading state while redirecting
  if (isAuthenticated && !isLoading) {
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
