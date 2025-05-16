// This file helps ensure Amplify environment variables are properly loaded
// It is used during the build process in Amplify hosting

const fs = require('fs');
const path = require('path');

// Try to load the amplify_outputs.json file
let amplifyOutputs = null;
try {
  // Look for amplify_outputs.json in various possible locations
  const possiblePaths = [
    path.join(__dirname, 'amplify_outputs.json'),
    path.join(__dirname, '.amplify', 'amplify_outputs.json'),
  ];
  
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      amplifyOutputs = JSON.parse(fileContent);
      console.log(`Found amplify_outputs.json at ${filePath}`);
      break;
    }
  }
} catch (error) {
  console.warn('Failed to load amplify_outputs.json:', error);
}

// If we found the outputs file, extract the environment variables
if (amplifyOutputs) {
  // Auth variables
  if (amplifyOutputs.auth) {
    process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID = amplifyOutputs.auth.user_pool_id;
    process.env.NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID = amplifyOutputs.auth.user_pool_client_id;
    process.env.NEXT_PUBLIC_AUTH_IDENTITY_POOL_ID = amplifyOutputs.auth.identity_pool_id;
    process.env.NEXT_PUBLIC_AUTH_REGION = amplifyOutputs.auth.aws_region;
  }
  
  // API variables
  if (amplifyOutputs.data) {
    process.env.NEXT_PUBLIC_API_ENDPOINT = amplifyOutputs.data.url;
    process.env.NEXT_PUBLIC_API_REGION = amplifyOutputs.data.aws_region;
    process.env.NEXT_PUBLIC_AMPLIFY_API_KEY = amplifyOutputs.data.api_key;
  }
  
  console.log('Environment variables set from amplify_outputs.json');
} else {
  console.log('No amplify_outputs.json found, will use existing environment variables');
}
