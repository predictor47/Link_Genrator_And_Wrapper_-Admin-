// Disable TypeScript strict checking for this file
// @ts-nocheck

// Export a function to get the config object (no side effects)
export function getAmplifyConfig() {
  return {
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID,
        userPoolClientId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID,
        identityPoolId: process.env.NEXT_PUBLIC_AUTH_IDENTITY_POOL_ID,
        region: process.env.NEXT_PUBLIC_AUTH_REGION || 'us-east-1',
      },
    },
    API: {
      GraphQL: {
        endpoint: process.env.NEXT_PUBLIC_API_ENDPOINT,
        region: process.env.NEXT_PUBLIC_API_REGION || 'us-east-1',
        apiKey: process.env.NEXT_PUBLIC_AMPLIFY_API_KEY,
      },
    },
  };
}