import { NextApiRequest, NextApiResponse } from 'next';
import { fetchAuthSession } from 'aws-amplify/auth';
import { CognitoIdentityProviderClient, ChangePasswordCommand } from "@aws-sdk/client-cognito-identity-provider";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'Old password and new password are required' 
    });
  }

  try {
    // Get the current session to extract the access token
    let accessToken;
    
    try {
      // Get current session from Amplify v6 using fetchAuthSession
      const session = await fetchAuthSession();
      accessToken = session.tokens?.accessToken?.toString();
      
      if (!accessToken) {
        throw new Error('No access token available');
      }
    } catch (error) {
      console.error('Error getting session:', error);
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required'
      });
    }

    // Create Cognito client
    const client = new CognitoIdentityProviderClient({
      region: process.env.NEXT_PUBLIC_AUTH_REGION || 'us-east-1'
    });

    // Create and execute the change password command
    const command = new ChangePasswordCommand({
      AccessToken: accessToken,
      PreviousPassword: oldPassword,
      ProposedPassword: newPassword
    });

    await client.send(command);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error: any) {
    console.error('Error changing password:', error);
    
    // Handle specific error cases
    let message = 'Failed to change password';
    
    if (error.name === 'NotAuthorizedException') {
      message = 'Incorrect password';
    } else if (error.name === 'InvalidPasswordException') {
      message = error.message || 'Password does not meet requirements';
    } else if (error.name === 'LimitExceededException') {
      message = 'Too many attempts. Please try again later';
    }
    
    return res.status(400).json({
      success: false,
      message
    });
  }
}