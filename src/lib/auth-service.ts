import { Auth } from 'aws-amplify';
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
  email_verified: boolean;
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

      const result = await Auth.signUp({
        username,
        password,
        attributes
      });

      return {
        isSuccess: true,
        message: 'Sign up successful! Please check your email for a verification code.',
        data: result
      };
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      // Handle specific error cases
      if (error.code === 'UsernameExistsException') {
        return {
          isSuccess: false,
          message: 'This username is already taken. Please try another one.'
        };
      }
      
      if (error.code === 'InvalidPasswordException') {
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
      await Auth.confirmSignUp(username, code);
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
      
      const user = await Auth.signIn(username, password);
      return user;
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Handle specific error cases
      if (error.code === 'UserNotConfirmedException') {
        throw new Error('Please confirm your account by entering the verification code sent to your email.');
      }
      
      if (error.code === 'NotAuthorizedException') {
        throw new Error('Incorrect username or password.');
      }
      
      if (error.code === 'UserNotFoundException') {
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
      await Auth.signOut();
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
      return await Auth.currentAuthenticatedUser();
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current user's session
   */
  static async getCurrentSession() {
    try {
      return await Auth.currentSession();
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      await Auth.currentAuthenticatedUser();
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
      const user = await Auth.currentAuthenticatedUser();
      return user.attributes;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update user attributes
   */
  static async updateUserAttributes(attributes: Record<string, string>): Promise<AuthResult> {
    try {
      const user = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(user, attributes);
      
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
      const user = await Auth.currentAuthenticatedUser();
      await Auth.changePassword(user, oldPassword, newPassword);
      
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
      await Auth.forgotPassword(username);
      
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
      await Auth.forgotPasswordSubmit(username, code, newPassword);
      
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
      await Auth.resendSignUp(username);
      
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
      const session = await Auth.currentSession();
      return session.getIdToken().getJwtToken();
    } catch (error) {
      return null;
    }
  }
}