import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './auth';
import { logAuthDiagnostics } from './auth-debug';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * ProtectedRoute component to guard admin routes
 * If the user is not authenticated, they will be redirected to the login page
 */
export default function ProtectedRoute({ 
  children, 
  redirectTo = '/admin/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not loading and not authenticated, redirect
    if (!isLoading && !isAuthenticated) {
      console.log('User not authenticated, redirecting to login page');
      
      // Log diagnostics before redirecting
      logAuthDiagnostics().then(() => {
        const redirect = encodeURIComponent(router.asPath);
        // Use window.location for more reliable navigation
        window.location.href = `${redirectTo}?redirect=${redirect}`;
      });
    }
  }, [isAuthenticated, isLoading, redirectTo, router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If authenticated, render children
  return isAuthenticated ? <>{children}</> : null;
}
