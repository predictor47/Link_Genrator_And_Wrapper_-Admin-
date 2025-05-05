import { Amplify } from 'aws-amplify';

let configurationDone = false;

// Domain configuration
export const MAIN_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com';
export const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || `admin.${MAIN_DOMAIN}`;

// Explicitly set Cognito User Pool ID
const COGNITO_USER_POOL_ID = 'us-east-1_QIwwMdokt';

/**
 * Configure Amplify with the right settings
 */
export function configureAmplify() {
  if (configurationDone) {
    return; // Avoid multiple configurations
  }

  let amplifyOutputs: any = null;

  // For server-side code
  if (typeof window === 'undefined') {
    try {
      // Use dynamic imports for Node.js-only modules
      const fs = require('fs');
      const path = require('path');
      
      const possiblePaths = [
        path.join(process.cwd(), 'amplify_outputs.json'),
        path.join(process.cwd(), '.amplify', 'amplify_outputs.json'),
        path.join(process.cwd(), 'src', 'amplify_outputs.json')
      ];
      
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          const outputsContent = fs.readFileSync(possiblePath, 'utf8');
          amplifyOutputs = JSON.parse(outputsContent);
          break;
        }
      }
    } catch (error) {
      console.warn('Failed to load amplify_outputs.json:', error);
    }
  }

  // If no outputs file was found or in browser context, use environment variables
  // but prioritize our explicit Cognito User Pool ID
  if (!amplifyOutputs) {
    amplifyOutputs = {
      auth: {
        userPoolId: COGNITO_USER_POOL_ID || process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID,
        userPoolClientId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID,
        identityPoolId: process.env.NEXT_PUBLIC_AUTH_IDENTITY_POOL_ID,
        region: 'us-east-1', // Derived from the User Pool ID
      },
      api: {
        endpoint: process.env.NEXT_PUBLIC_API_ENDPOINT,
        region: process.env.NEXT_PUBLIC_API_REGION || 'us-east-1',
      }
    };
  } else {
    // Ensure the User Pool ID is set even if we found an outputs file
    amplifyOutputs.auth = {
      ...amplifyOutputs.auth,
      userPoolId: COGNITO_USER_POOL_ID || amplifyOutputs.auth?.userPoolId
    };
  }

  // Get the region from outputs or environment variables
  const region = 'us-east-1'; // Hardcoded to match the User Pool ID region

  // Configure Amplify with the retrieved settings
  try {
    const config: any = {
      // Auth Configuration
      Auth: {
        Cognito: {
          userPoolId: COGNITO_USER_POOL_ID || amplifyOutputs.auth?.userPoolId || '',
          userPoolClientId: amplifyOutputs.auth?.userPoolClientId || '',
          identityPoolId: amplifyOutputs.auth?.identityPoolId || '',
        }
      },
      // API Configuration for GraphQL
      API: {
        GraphQL: {
          endpoint: amplifyOutputs.api?.endpoint || '',
          region: amplifyOutputs.api?.region || region,
          defaultAuthMode: 'userPool'
        }
      }
    };
    
    // Add region at root level for Amplify v6
    config.region = region;
    
    // Apply configuration
    Amplify.configure(config);
    
    configurationDone = true;
    console.log('Amplify configured with User Pool ID:', COGNITO_USER_POOL_ID);
  } catch (error) {
    console.error('Error configuring Amplify:', error);
  }
}

// Export the raw Amplify config for use elsewhere
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: COGNITO_USER_POOL_ID || process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID || '',
      identityPoolId: process.env.NEXT_PUBLIC_AUTH_IDENTITY_POOL_ID || '',
    }
  },
  API: {
    GraphQL: {
      endpoint: process.env.NEXT_PUBLIC_API_ENDPOINT || '',
      region: process.env.NEXT_PUBLIC_API_REGION || 'us-east-1',
      defaultAuthMode: 'userPool'
    }
  },
  // Domain configuration
  domains: {
    main: MAIN_DOMAIN,
    admin: ADMIN_DOMAIN
  }
} as any;