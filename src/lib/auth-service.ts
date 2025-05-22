import { signIn, signUp, signOut, confirmSignUp, resetPassword, confirmResetPassword, 
  getCurrentUser, fetchUserAttributes, updateUserAttributes, fetchAuthSession,
  resendSignUpCode, confirmSignIn } from 'aws-amplify/auth';
import { configureAmplify } from './amplify-config';

// Make sure Amplify is configured
configureAmplify();

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
      
      // Handle "already signed in" case as a successful login
      if (error.message?.includes('already a signed in user')) {
        return {
          isSuccess: true,
          message: 'User is already signed in',
          data: { isSignedIn: true }
        };
      }
      
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
    } catch (error) {
      console.error('Sign out error:', error);
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
    
    // Return cached result if still valid
    if (this.sessionCheckPromise && (now - this.lastSessionCheck) < this.sessionCheckInterval) {
      return this.sessionCheckPromise;
    }

    // Create new check promise
    this.sessionCheckPromise = (async () => {
      try {
        const session = await fetchAuthSession();
        const isAuth = !!session.tokens?.accessToken;
        console.log('Auth check result:', isAuth);
        return isAuth;
      } catch (error) {
        console.error('Auth check failed:', error);
        return false;
      }
    })();

    this.lastSessionCheck = now;
    return this.sessionCheckPromise;
  }

  /**
   * Reset the authentication session cache to force a fresh check
   */
  static resetSessionCache(): void {
    this.lastSessionCheck = 0;
    this.sessionCheckPromise = null;
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
}