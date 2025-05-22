import { useEffect, ReactNode, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './auth';
import { fixProblemCookies } from './cookie-manager';
import { AuthService } from './auth-service';

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
  const { redirect } = router.query;
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    // First check for and fix any cookie issues
    fixProblemCookies();
    
    // Log current auth state
    console.log('AuthRedirectCheck status:', { 
      isAuthenticated, 
      isLoading, 
      currentPath: router.pathname,
      redirectTo 
    });
  }, [isAuthenticated, isLoading, router, redirectTo]);
  
  useEffect(() => {
    const handleRedirect = async () => {
      if (isAuthenticated && !isLoading && !redirectAttempted) {
        console.log('User is authenticated, redirecting to:', redirectTo);
        setRedirectAttempted(true);
        
        // Force refresh auth state one more time to be sure
        AuthService.resetSessionCache();
        await refreshAuthState();
        
        // If still authenticated, redirect
        if (isAuthenticated) {
          router.replace(redirectTo);
        }
      }
    };
    
    handleRedirect();
  }, [isAuthenticated, isLoading, redirectTo, router, redirectAttempted, refreshAuthState]);

  // Always render children - this allows login forms to appear while checking auth
  return <>{children}</>;
}
