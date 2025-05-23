import { signIn, signUp, signOut, confirmSignUp, resetPassword, confirmResetPassword, 
  getCurrentUser, fetchUserAttributes, updateUserAttributes, fetchAuthSession,
  resendSignUpCode, confirmSignIn } from 'aws-amplify/auth';
import { getAmplifyConfig } from './amplify-config';
import { Amplify } from 'aws-amplify';

// Initialize Amplify with config (client-side only, and with required fields)
if (typeof window !== 'undefined' && Amplify && typeof Amplify.configure === 'function') {
  const amplifyConfig = getAmplifyConfig();
  if (amplifyConfig.API && amplifyConfig.API.GraphQL) {
    (amplifyConfig.API.GraphQL as any).defaultAuthMode = (amplifyConfig.API.GraphQL as any).defaultAuthMode || 'userPool';
  }
  Amplify.configure(amplifyConfig as any);
}

type SignUpParams = {
  username: string;
  password: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

type SignInParams = {
  username: string;
  password: string;
};

type AuthResult = {
  isSuccess: boolean;
  message: string;
  data?: any;
  nextStep?: {
    signInStep: string;
    [key: string]: any;
  };
};

type UserAttributes = {
  email: string;
  email_verified: string | boolean;
  sub: string;
  name?: string;
  family_name?: string;
  'custom:role'?: string;
  [key: string]: any;
};

/**
 * Service to handle AWS Cognito authentication
 */
export class AuthService {
  private static sessionCheckPromise: Promise<boolean> | null = null;
  private static lastSessionCheck: number = 0;
  private static sessionCheckInterval = 30000; // 30 seconds
  private static forceRefresh = false;

  /**
   * Sign up a new user
   */
  static async signUp(params: SignUpParams): Promise<AuthResult> {
    try {
      const { username, password, email, firstName, lastName } = params;

      const attributes = {
        email,
        ...(firstName && { name: firstName }),
        ...(lastName && { family_name: lastName })
      };

      const result = await signUp({
        username,
        password,
        options: {
          userAttributes: attributes
        }
      });

      return {
        isSuccess: true,
        message: 'Sign up successful! Please check your email for a verification code.',
        data: result
      };
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      if (error.name === 'UsernameExistsException') {
        return {
          isSuccess: false,
          message: 'This username is already taken. Please try another one.'
        };
      }

      return {
        isSuccess: false,
        message: error.message || 'Failed to sign up. Please try again.'
      };
    }
  }

  /**
   * Sign in a user
   */
  static async signIn(params: SignInParams): Promise<AuthResult> {
    try {
      // Clear any existing auth cookies before signing in to prevent conflicts
      if (typeof document !== 'undefined') {
        document.cookie.split(';').forEach(cookie => {
          const [name] = cookie.split('=').map(c => c.trim());
          if (name.includes('CognitoIdentityServiceProvider') || 
              name.includes('amplify') || 
              name.includes('Token')) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        });
      }
      
      const { username, password } = params;
      
      const result = await signIn({
        username,
        password
      });
      
      // Wait for session to be established
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.waitForSession();

      return {
        isSuccess: true,
        message: 'Successfully signed in',
        data: result,
        nextStep: result.nextStep
      };
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      if (error.name === 'UserNotConfirmedException') {
        return {
          isSuccess: false,
          message: 'Please confirm your account by entering the verification code sent to your email.'
        };
      }
      
      if (error.name === 'NotAuthorizedException') {
        return {
          isSuccess: false,
          message: 'Incorrect username or password.'
        };
      }
      
      if (error.name === 'UserNotFoundException') {
        return {
          isSuccess: false,
          message: 'User does not exist.'
        };
      }
      
      return {
        isSuccess: false,
        message: error.message || 'Failed to sign in. Please try again.'
      };
    }
  }

  /**
   * Confirm a user's sign up with verification code
   */
  static async confirmSignUp(username: string, code: string): Promise<void> {
    try {
      await confirmSignUp({
        username, 
        confirmationCode: code
      });
    } catch (error: any) {
      console.error('Confirm sign up error:', error);
      throw error;
    }
  }

  /**
   * Sign out the current user
   */
  static async signOut(): Promise<void> {
    try {
      await signOut({ global: true });
      this.lastSessionCheck = 0;
      this.sessionCheckPromise = null;
      
      // Clear all auth-related cookies manually after signout
      if (typeof document !== 'undefined') {
        document.cookie.split(';').forEach(cookie => {
          const [name] = cookie.split('=').map(c => c.trim());
          if (name.includes('CognitoIdentityServiceProvider') || 
              name.includes('amplify') || 
              name.includes('Token') ||
              name.includes('auth')) {
            console.log('Clearing cookie after signout:', name);
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        });
      }
      
      // If we're in a browser, redirect to login page after signout
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login?fixed=true';
      }
    } catch (error) {
      console.error('Sign out error:', error);
      
      // Even if there was an error, try to clear cookies
      if (typeof document !== 'undefined') {
        document.cookie.split(';').forEach(cookie => {
          const [name] = cookie.split('=').map(c => c.trim());
          if (name.includes('CognitoIdentityServiceProvider') || 
              name.includes('amplify') || 
              name.includes('Token')) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        });
      }
      
      throw error;
    }
  }

  /**
   * Get the current authenticated user
   */
  static async getCurrentUser() {
    try {
      const user = await getCurrentUser();
      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Wait for a valid session to be established
   */
  private static async waitForSession(maxAttempts = 5): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await fetchAuthSession();
        return true;
      } catch (error) {
        if (i === maxAttempts - 1) {
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return false;
  }

  /**
   * Check if a user is authenticated with caching
   */
  static async isAuthenticated(): Promise<boolean> {
    const now = Date.now();
    
    // Skip cache when force refresh happens
    if (this.forceRefresh) {
      this.forceRefresh = false;
      this.lastSessionCheck = 0;
      this.sessionCheckPromise = null;
    }
    
    // Return cached result if still valid and not too old
    if (this.sessionCheckPromise && (now - this.lastSessionCheck) < this.sessionCheckInterval) {
      return this.sessionCheckPromise;
    }

    // Create new check promise with better error handling
    this.sessionCheckPromise = (async () => {
      try {
        const session = await fetchAuthSession();
        const isValid = !!session.tokens?.accessToken;
        
        if (isValid) {
          console.log('Valid authentication session found');
        } else {
          console.log('No valid authentication session');
        }
        
        return isValid;
      } catch (error) {
        console.error('Error checking authentication:', error);
        // If we get a "No current user" error, definitely not authenticated
        if (error instanceof Error && error.message.includes('No current user')) {
          return false;
        }
        // For other errors, we can't be sure, default to not authenticated
        return false;
      }
    })();

    this.lastSessionCheck = now;
    return this.sessionCheckPromise;
  }

  /**
   * Get the current user's attributes
   */
  static async getUserAttributes(): Promise<UserAttributes | null> {
    try {
      const attributes = await fetchUserAttributes();
      return attributes as unknown as UserAttributes;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update user attributes
   */
  static async updateUserAttributes(attributes: Record<string, string>): Promise<AuthResult> {
    try {
      await updateUserAttributes({
        userAttributes: attributes
      });
      
      return {
        isSuccess: true,
        message: 'User attributes updated successfully.'
      };
    } catch (error: any) {
      console.error('Update user attributes error:', error);
      
      return {
        isSuccess: false,
        message: error.message || 'Failed to update user attributes.'
      };
    }
  }

  /**
   * Complete new password challenge
   */
  static async completeNewPassword(newPassword: string): Promise<AuthResult> {
    try {
      const result = await confirmSignIn({
        challengeResponse: newPassword
      });
      
      // Wait for session to be established after password change
      await this.waitForSession();
      
      return {
        isSuccess: result.isSignedIn,
        message: 'Password set successfully.'
      };
    } catch (error: any) {
      console.error('Complete new password error:', error);
      
      return {
        isSuccess: false,
        message: error.message || 'Failed to set new password.'
      };
    }
  }

  /**
   * Get current user's ID token
   */
  static async getIdToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  }

  /**
   * Force a refresh of the authentication state
   */
  static async refreshAuthState(): Promise<void> {
    this.forceRefresh = true;
    this.lastSessionCheck = 0;
    this.sessionCheckPromise = null;
    
    try {
      // Try to fetch the auth session to refresh the tokens
      const session = await fetchAuthSession();
      console.log('Auth session refreshed successfully', {
        hasIdToken: !!session.tokens?.idToken,
        hasAccessToken: !!session.tokens?.accessToken,
        // Check for tokens object existence instead of specific refreshToken property
        hasTokens: !!session.tokens
      });
    } catch (error) {
      console.error('Error refreshing auth session:', error);
      
      // Clear problematic cookies if there's an error
      if (typeof window !== 'undefined') {
        window.document.cookie.split(';').forEach(cookie => {
          const [name] = cookie.split('=').map(c => c.trim());
          if (name.includes('CognitoIdentityServiceProvider') || 
              name.includes('amplify') || 
              name.includes('Token')) {
            console.log('Clearing problematic cookie:', name);
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        });
      }
    }
  }
}