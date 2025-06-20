import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService } from './auth-service';
import { fixProblemCookies } from './cookie-manager';

// Remove import { configureAmplify } from './amplify-config';
// If you need config, use:
// import { getAmplifyConfig } from './amplify-config';

// Define the authentication context type
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  login: (username: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  signUp: (params: any) => Promise<any>;
  confirmSignUp: (username: string, code: string) => Promise<void>;
  completeNewPassword: (newPassword: string) => Promise<any>;
  refreshAuthState: () => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component that wraps your app and makes auth object available to any child component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  // Function to check authentication status and update state
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
      
      // Try fixing cookie issues if auth check fails
      fixProblemCookies();
    } finally {
      setIsLoading(false);
    }
  };

  // Check auth status when the component mounts
  useEffect(() => {
    checkAuth();
    
    // Set up a refresh interval to periodically check authentication status
    // Only check every 10 minutes instead of 5 for better performance
    const interval = setInterval(async () => {
      try {
        const authenticated = await AuthService.isAuthenticated();
        if (authenticated !== isAuthenticated) {
          checkAuth();
        }
      } catch (error) {
        console.error('Error refreshing authentication status');
      }
    }, 10 * 60 * 1000); // Check every 10 minutes
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Login function that uses AuthService
  const login = async (username: string, password: string) => {
    const result = await AuthService.signIn({ username, password });
    if (result.isSuccess) {
      await checkAuth();
    }
    return result;
  };

  // Logout function
  const logout = async () => {
    await AuthService.signOut();
    await checkAuth();
  };

  // Wrapper for signup that refreshes auth state on success
  const signUp = async (params: any) => {
    const result = await AuthService.signUp(params);
    return result;
  };

  // Wrapper for completeNewPassword
  const completeNewPassword = async (newPassword: string) => {
    const result = await AuthService.completeNewPassword(newPassword);
    if (result.isSuccess) {
      await checkAuth();
    }
    return result;
  };

  // Function to manually refresh auth state
  const refreshAuthState = async () => {
    try {
      // Call the new method to force refresh token validation
      await AuthService.refreshAuthState();
      // Then check auth status again
      await checkAuth();
      
      // If we've refreshed multiple times without success, try a hard reload
      if (typeof window !== 'undefined') {
        const win = window as any;
        if (win._authRefreshCount === undefined) {
          win._authRefreshCount = 1;
        } else {
          win._authRefreshCount++;
        }
        
        if (win._authRefreshCount > 2) {
          console.log('Multiple auth refreshes attempted, trying hard reload');
          win._authRefreshCount = 0;
          // Only reload if we're on a page that needs auth
          if (window.location.pathname.startsWith('/admin') && 
              !window.location.pathname.startsWith('/admin/login') && 
              !window.location.pathname.startsWith('/admin/signup') && 
              !window.location.pathname.startsWith('/admin/verify')) {
            window.location.reload();
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing auth state:', error);
    }
  };

  // Provide the auth context value
  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    signUp,
    confirmSignUp: AuthService.confirmSignUp,
    completeNewPassword,
    refreshAuthState
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}