import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService } from './auth-service';
import { configureAmplify } from './amplify-config';
import { fixProblemCookies } from './cookie-manager';

// Initialize Amplify once at the module level
configureAmplify();

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
    await checkAuth();
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