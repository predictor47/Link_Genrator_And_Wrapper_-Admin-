import { useEffect, ReactNode, useState } from 'react';
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
  const [tooManyRedirects, setTooManyRedirects] = useState(false);

  useEffect(() => {
    // Check for redirect_count cookie
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/redirect_count=(\d+)/);
      const count = match ? parseInt(match[1], 10) : 0;
      if (count > 5) {
        setTooManyRedirects(true);
        return;
      }
    }
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

  if (tooManyRedirects) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="bg-white p-8 rounded shadow text-center max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-4 text-red-600">Too many login attempts</h2>
          <p className="mb-4">You have been redirected too many times. Please clear your cookies, log in again, or contact support if the problem persists.</p>
        </div>
      </div>
    );
  }

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
