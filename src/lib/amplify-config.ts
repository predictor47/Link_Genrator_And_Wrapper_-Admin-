import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
// Fix import path to use relative path instead of alias
import { Schema } from '../../amplify/data/resource';

// Environment detection (for logging purposes)
const isDevelopment = process.env.NODE_ENV === 'development';
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

// Domain configuration
export const MAIN_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'protegeresearchsurvey.com';
export const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || `admin.${MAIN_DOMAIN}`;

let configurationDone = false;
// Define amplifyOutputs at the module level
let amplifyOutputs: any = null;

// Create a data client for interacting with your Amplify backend
export const client = generateClient<Schema>();

/**
 * Configure Amplify with the right settings
 */
export function configureAmplify() {
  if (configurationDone) {
    return; // Avoid multiple configurations
  }

  // Try to load amplify_outputs.json in both server and client environments
  if (typeof window === 'undefined') {
    // For server-side code
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
          console.log(`Loaded amplify_outputs.json from ${possiblePath}`);
          break;
        }
      }
    } catch (error) {
      console.warn('Failed to load amplify_outputs.json on server:', error);
    }
  } else {
    // For client-side code, try to fetch the config
    if (!amplifyOutputs) {
      // For localhost development with sandbox
      if (isDevelopment && isLocalhost) {
        console.log('Development environment detected; loading sandbox outputs');
        try {
          // For sandbox, load the sandbox-generated outputs file
          fetch('/amplify_outputs.json')
            .then(response => response.json())
            .then(outputs => {
              amplifyOutputs = outputs;
              console.log('Successfully loaded sandbox amplify_outputs.json');
              
              // Configure Amplify with the loaded sandbox outputs
              doConfiguration();
            })
            .catch(err => {
              console.warn('Failed to load sandbox amplify_outputs.json:', err);
              // Fall through to use the sandbox's auto-configuration
            });
        } catch (err) {
          console.warn('Error loading sandbox outputs:', err);
        }
        
        configurationDone = true;
        return;
      }

      // For production, try to load the amplify_outputs.json
      try {
        // In browser context, we need to use a webpack-compatible require
        const amplifyOutputsPath = require.resolve('../../amplify_outputs.json');
        const outputs = require(amplifyOutputsPath);
        amplifyOutputs = outputs;
        console.log('Loaded amplify_outputs.json on client');
        // Configure Amplify with the loaded outputs
        doConfiguration();
        return;
      } catch (err) {
        console.warn('Failed to load amplify_outputs.json on client:', err);
        // Fall through to use environment variables
      }
    }
  }
    // Proceed with configuration using available outputs or environment variables
  doConfiguration();
}

  function doConfiguration() {
    // If no outputs file was found, use environment variables as fallback
    if (!amplifyOutputs) {
      console.log('Using environment variables for Amplify configuration');
      amplifyOutputs = {
        auth: {
          user_pool_id: process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID,
          user_pool_client_id: process.env.NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID,
          identity_pool_id: process.env.NEXT_PUBLIC_AUTH_IDENTITY_POOL_ID,
          aws_region: process.env.NEXT_PUBLIC_AUTH_REGION || 'us-east-1',
        },
        data: {
          url: process.env.NEXT_PUBLIC_API_ENDPOINT,
          aws_region: process.env.NEXT_PUBLIC_API_REGION || 'us-east-1',
          api_key: process.env.NEXT_PUBLIC_AMPLIFY_API_KEY,
        }
      };
    }

    // Get the region from outputs or environment variables
    const region = amplifyOutputs.auth?.aws_region || amplifyOutputs.data?.aws_region || 'us-east-1';
    
    // Configure Amplify with the retrieved settings
    try {
      const config: any = {
        // Auth Configuration
        Auth: {
          Cognito: {
            userPoolId: amplifyOutputs.auth?.user_pool_id || '',
            userPoolClientId: amplifyOutputs.auth?.user_pool_client_id || '',
            identityPoolId: amplifyOutputs.auth?.identity_pool_id || '',
            region: amplifyOutputs.auth?.aws_region || region,
          }
        },
        // API Configuration for GraphQL
        API: {
          GraphQL: {
            endpoint: amplifyOutputs.data?.url || '',
            region: amplifyOutputs.data?.aws_region || region,
            defaultAuthMode: 'apiKey',
            apiKey: amplifyOutputs.data?.api_key || ''
          }
        }
      };
      
      // Add region at root level for Amplify v6
      config.region = region;
      
      // Apply configuration
      Amplify.configure(config);
      
      configurationDone = true;
      console.log(`Amplify configured in ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'} environment`);
      console.log('Using User Pool ID:', amplifyOutputs.auth?.user_pool_id);
      console.log('API Key configured:', amplifyOutputs.data?.api_key ? 'Yes (masked)' : 'No');
    } catch (error) {
      console.error('Error configuring Amplify:', error);
    }
  }


// Export the raw Amplify config for use elsewhere
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: amplifyOutputs?.auth?.user_pool_id || process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID || '',
      userPoolClientId: amplifyOutputs?.auth?.user_pool_client_id || process.env.NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID || '',
      identityPoolId: amplifyOutputs?.auth?.identity_pool_id || process.env.NEXT_PUBLIC_AUTH_IDENTITY_POOL_ID || '',
      region: amplifyOutputs?.auth?.aws_region || 'us-east-1',
    }
  },
  API: {
    GraphQL: {
      endpoint: amplifyOutputs?.data?.url || process.env.NEXT_PUBLIC_API_ENDPOINT || '',
      region: amplifyOutputs?.data?.aws_region || process.env.NEXT_PUBLIC_API_REGION || 'us-east-1',
      defaultAuthMode: 'apiKey',
      apiKey: amplifyOutputs?.data?.api_key || process.env.NEXT_PUBLIC_AMPLIFY_API_KEY || ''
    }
  },
  // Domain configuration
  domains: {
    main: MAIN_DOMAIN,
    admin: ADMIN_DOMAIN
  },
  // Environment information
  environment: isDevelopment ? 'development' : 'production'
} as any;