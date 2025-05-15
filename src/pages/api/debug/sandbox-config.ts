import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only in development mode
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ message: 'Not available in production' });
  }

  try {
    // Read the amplify_outputs.json file
    const outputsPath = path.join(process.cwd(), 'amplify_outputs.json');
    const exists = fs.existsSync(outputsPath);
    
    if (exists) {
      const outputsContent = fs.readFileSync(outputsPath, 'utf8');
      const outputs = JSON.parse(outputsContent);
      
      // Return sanitized outputs (hide API keys and sensitive values)
      return res.status(200).json({
        success: true,
        message: 'Sandbox configuration found',
        sandboxDetected: true,
        authConfig: {
          userPoolFound: !!outputs.auth?.user_pool_id,
          userPoolId: outputs.auth?.user_pool_id ? outputs.auth.user_pool_id.substring(0, 10) + '...' : null,
          region: outputs.auth?.aws_region || null,
        },
        apiConfig: {
          endpointFound: !!outputs.data?.url,
          apiKeyConfigured: !!outputs.data?.api_key,
        },
        nodeEnv: process.env.NODE_ENV
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Sandbox outputs file not found',
        sandboxDetected: false,
        nodeEnv: process.env.NODE_ENV
      });
    }
  } catch (error: any) {
    console.error('Error checking sandbox config:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error checking sandbox configuration',
      error: error.message 
    });
  }
}
