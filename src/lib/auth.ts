import { useState, useEffect } from 'react';
import { AuthService } from './auth-service';

/**
 * Custom React hook to handle authentication state
 * This provides a consistent way to access authentication state throughout the application
 */
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // Check if user is authenticated
        const authenticated = await AuthService.isAuthenticated();
        setIsAuthenticated(authenticated);
        
        // If authenticated, get user info
        if (authenticated) {
          const currentUser = await AuthService.getCurrentUser();
          const attributes = await AuthService.getUserAttributes();
          setUser({ ...currentUser, attributes });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
    
    // Set up a refresh interval to periodically check authentication status
    const interval = setInterval(async () => {
      try {
        const authenticated = await AuthService.isAuthenticated();
        if (authenticated !== isAuthenticated) {
          checkAuth();
        }
      } catch (error) {
        console.error('Error refreshing authentication status:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return {
    isAuthenticated,
    isLoading,
    user,
    signIn: AuthService.signIn,
    signOut: AuthService.signOut,
    signUp: AuthService.signUp,
    confirmSignUp: AuthService.confirmSignUp,
  };
};
