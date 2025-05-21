// Disable TypeScript strict checking for this file
// @ts-nocheck
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../amplify/data/resource';

// Initialize configuration state once
let isConfigured = false;
let amplifyOutputs: any = null;

// Export configuration object for diagnostics
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID,
      userPoolClientId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID,
      identityPoolId: process.env.NEXT_PUBLIC_AUTH_IDENTITY_POOL_ID,
      region: process.env.NEXT_PUBLIC_AUTH_REGION || 'us-east-1'
    }
  },
  API: {
    GraphQL: {
      endpoint: process.env.NEXT_PUBLIC_API_ENDPOINT,
      region: process.env.NEXT_PUBLIC_API_REGION || 'us-east-1',
      apiKey: process.env.NEXT_PUBLIC_AMPLIFY_API_KEY
    }
  }
};

/**
 * Configure Amplify with the right settings
 * This function can be called multiple times safely
 */
export async function configureAmplify() {
  if (isConfigured) {
    return;
  }

  try {
    // Try to load amplify_outputs.json in both server and client environments
    if (typeof window === 'undefined') {
      // Server-side configuration
      try {
        const fs = require('fs');
        const path = require('path');
        const possiblePaths = [
          path.join(process.cwd(), 'amplify_outputs.json'),
          path.join(process.cwd(), '.amplify', 'amplify_outputs.json'),
        ];
        
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            const outputsContent = fs.readFileSync(possiblePath, 'utf8');
            amplifyOutputs = JSON.parse(outputsContent);
            break;
          }
        }
      } catch (error) {
        console.warn('Failed to load amplify_outputs.json on server');
      }
    } else {
      // Client-side configuration
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isLocalhost = window.location.hostname === 'localhost';

      if (isDevelopment && isLocalhost) {
        try {
          const response = await fetch('/amplify_outputs.json');
          amplifyOutputs = await response.json();
        } catch (err) {
          console.warn('Failed to load sandbox amplify_outputs.json');
        }
      }
    }

    // Get the region from outputs or environment variables
    const region = amplifyOutputs?.auth?.aws_region || 
      process.env.NEXT_PUBLIC_AUTH_REGION || 
      'us-east-1';
    
    // Determine if we're running on a custom domain
    const isCustomDomain = typeof window !== 'undefined' && 
      window.location.hostname !== 'localhost' && 
      !window.location.hostname.includes('amplifyapp.com');
    
    // Get domain parts for cookie configuration
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const cookieDomain = isCustomDomain ? hostname.split('.').slice(-2).join('.') : undefined;
    
    // Create a minimal config that will work
    const config = {
      Auth: {
        Cognito: {
          userPoolId: amplifyOutputs?.auth?.user_pool_id || process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID || '',
          userPoolClientId: amplifyOutputs?.auth?.user_pool_client_id || process.env.NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID || '',
          region: region
        }
      }
    };
    
    // Add cookie storage
    if (typeof window !== 'undefined') {
      config.Auth.cookieStorage = {
        domain: cookieDomain,
        path: '/',
        expires: 365,
        secure: !window.location.hostname.includes('localhost'),
        sameSite: 'strict'
      };
    }
    
    // Configure Amplify with the generated config
    Amplify.configure(config);
    isConfigured = true;
  } catch (error) {
    console.error('Error configuring Amplify');
  }
}