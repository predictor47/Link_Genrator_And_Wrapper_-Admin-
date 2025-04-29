import { NextApiRequest, NextApiResponse } from 'next';
import { generateChallenge, verifyChallengeResponse } from '@/lib/captcha';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS for cross-domain requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Generate a new challenge
  if (req.method === 'GET') {
    const fingerprint = req.query.fingerprint as string;
    
    if (!fingerprint) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing browser fingerprint' 
      });
    }
    
    try {
      const challenge = generateChallenge({ fingerprint });

      // Don't expose answer in the response
      return res.status(200).json({
        success: true,
        challenge
      });
    } catch (error) {
      console.error('Error generating challenge:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate challenge'
      });
    }
  }
  
  // Verify a challenge response
  if (req.method === 'POST') {
    try {
      const { id, answer, fingerprint, timing } = req.body;
      
      if (!id || answer === undefined || !fingerprint || !timing) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }
      
      const result = verifyChallengeResponse({
        id,
        answer,
        fingerprint,
        timing
      });
      
      return res.status(200).json({
        success: result.valid,
        error: result.reason,
        token: result.valid ? generateVerificationToken(fingerprint) : null
      });
    } catch (error) {
      console.error('Error verifying challenge:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify challenge'
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

// Generate a verification token once captcha is solved
function generateVerificationToken(fingerprint: string): string {
  const crypto = require('crypto');
  const timestamp = Date.now();
  const data = `${fingerprint}:${timestamp}:${process.env.CAPTCHA_SECRET_KEY || 'default-secret'}`;
  
  const hash = crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
  
  // Short-lived token (valid for 1 hour)
  return `${timestamp}:${hash}`;
}