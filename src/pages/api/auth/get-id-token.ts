import { NextApiRequest, NextApiResponse } from 'next';
import { fetchAuthSession } from 'aws-amplify/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the current session to extract the ID token
    try {
      // Get current session from Amplify v6 using fetchAuthSession
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      
      if (!idToken) {
        throw new Error('ID token not available');
      }
      
      // Return just the token string
      return res.status(200).send(idToken);
    } catch (error) {
      console.error('Error getting ID token:', error);
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required'
      });
    }
  } catch (error: any) {
    console.error('Error in get-id-token endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve ID token'
    });
  }
}