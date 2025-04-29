import { Amplify } from 'aws-amplify';

/**
 * Amplify configuration including Auth and API settings
 */
export const amplifyConfig = {
  Auth: {
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    userPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID || '',
    userPoolWebClientId: process.env.NEXT_PUBLIC_AWS_USER_POOL_WEB_CLIENT_ID || '',
    mandatorySignIn: false,
    cookieStorage: {
      domain: typeof window !== 'undefined' ? window.location.hostname : '',
      path: '/',
      expires: 365,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  },
  API: {
    GraphQL: {
      endpoint: process.env.NEXT_PUBLIC_APPSYNC_ENDPOINT || '',
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
      defaultAuthMode: 'apiKey',
      apiKey: process.env.NEXT_PUBLIC_APPSYNC_API_KEY || ''
    }
  }
};

/**
 * Configure AWS Amplify with the appropriate settings
 * @returns Configured Amplify instance
 */
export function configureAmplify() {
  // Use type assertion to handle the configuration type mismatch
  Amplify.configure(amplifyConfig as any);
  return Amplify;
}

// Export SSR-safe version to avoid window is not defined errors
export const getServerSideConfig = () => ({
  Auth: {
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    userPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID || '',
    userPoolWebClientId: process.env.NEXT_PUBLIC_AWS_USER_POOL_WEB_CLIENT_ID || '',
    mandatorySignIn: false
  },
  API: {
    GraphQL: {
      endpoint: process.env.NEXT_PUBLIC_APPSYNC_ENDPOINT || '',
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
      defaultAuthMode: 'apiKey',
      apiKey: process.env.NEXT_PUBLIC_APPSYNC_API_KEY || ''
    }
  }
});