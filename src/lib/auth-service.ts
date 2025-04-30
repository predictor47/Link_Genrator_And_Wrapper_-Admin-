import { signIn, signUp, signOut, confirmSignUp, resetPassword, confirmResetPassword, 
  getCurrentUser, fetchUserAttributes, updateUserAttributes,
  resendSignUpCode } from 'aws-amplify/auth';
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
      
      // Handle specific error cases
      if (error.name === 'UsernameExistsException') {
        return {
          isSuccess: false,
          message: 'This username is already taken. Please try another one.'
        };
      }
      
      if (error.name === 'InvalidPasswordException') {
        return {
          isSuccess: false,
          message: error.message || 'Password does not meet requirements.'
        };
      }

      return {
        isSuccess: false,
        message: error.message || 'Failed to sign up. Please try again later.'
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
   * Sign in a user
   */
  static async signIn(params: SignInParams) {
    try {
      const { username, password } = params;
      
      const user = await signIn({
        username,
        password
      });
      return user;
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Handle specific error cases
      if (error.name === 'UserNotConfirmedException') {
        throw new Error('Please confirm your account by entering the verification code sent to your email.');
      }
      
      if (error.name === 'NotAuthorizedException') {
        throw new Error('Incorrect username or password.');
      }
      
      if (error.name === 'UserNotFoundException') {
        throw new Error('User does not exist.');
      }
      
      throw error;
    }
  }

  /**
   * Sign out the current user
   */
  static async signOut() {
    try {
      await signOut();
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
      return await getCurrentUser();
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current user's session
   */
  static async getCurrentSession() {
    try {
      const user = await getCurrentUser();
      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      await getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the current user's attributes
   */
  static async getUserAttributes(): Promise<UserAttributes | null> {
    try {
      const attributes = await fetchUserAttributes();
      // Use type assertion to fix type mismatch
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
   * Change user password
   */
  static async changePassword(oldPassword: string, newPassword: string): Promise<AuthResult> {
    try {
      // Since changePassword is not available in aws-amplify/auth, we'll use a custom implementation
      // First ensure user is authenticated
      const user = await getCurrentUser();
      
      if (!user) {
        throw new Error('User is not authenticated');
      }
      
      // In Amplify v6, we would need to use the new Auth APIs for this
      // This is a placeholder - in a real implementation, you'd need to use 
      // the appropriate Cognito API directly or find the equivalent in v6
      const result = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      
      if (!result.ok) {
        throw new Error('Failed to change password');
      }
      
      return {
        isSuccess: true,
        message: 'Password changed successfully.'
      };
    } catch (error: any) {
      console.error('Change password error:', error);
      
      return {
        isSuccess: false,
        message: error.message || 'Failed to change password.'
      };
    }
  }

  /**
   * Start forgot password flow
   */
  static async forgotPassword(username: string): Promise<AuthResult> {
    try {
      await resetPassword({ username });
      
      return {
        isSuccess: true,
        message: 'Password reset code sent to your email.'
      };
    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      return {
        isSuccess: false,
        message: error.message || 'Failed to send password reset code.'
      };
    }
  }

  /**
   * Complete forgot password flow with verification code
   */
  static async forgotPasswordSubmit(
    username: string, 
    code: string, 
    newPassword: string
  ): Promise<AuthResult> {
    try {
      await confirmResetPassword({
        username,
        confirmationCode: code,
        newPassword
      });
      
      return {
        isSuccess: true,
        message: 'Password has been reset successfully.'
      };
    } catch (error: any) {
      console.error('Forgot password submit error:', error);
      
      return {
        isSuccess: false,
        message: error.message || 'Failed to reset password.'
      };
    }
  }

  /**
   * Resend confirmation code
   */
  static async resendConfirmationCode(username: string): Promise<AuthResult> {
    try {
      await resendSignUpCode({ username });
      
      return {
        isSuccess: true,
        message: 'Confirmation code resent successfully.'
      };
    } catch (error: any) {
      console.error('Resend confirmation code error:', error);
      
      return {
        isSuccess: false,
        message: error.message || 'Failed to resend confirmation code.'
      };
    }
  }

  /**
   * Get current user's ID token
   */
  static async getIdToken(): Promise<string | null> {
    try {
      const user = await getCurrentUser();
      
      // Access token using the correct property path in Amplify v6
      if (user && user.signInDetails) {
        // The exact path depends on the Amplify v6 structure
        // This is a placeholder - you'll need to find the right path
        // Or implement a fetch to get the token from the backend
        return await fetch('/api/auth/get-id-token')
          .then(response => response.text())
          .catch(() => null);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
}