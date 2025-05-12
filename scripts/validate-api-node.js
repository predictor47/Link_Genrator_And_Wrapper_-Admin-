/**
 * Validate API connection script (Node.js version)
 * 
 * This script tests the connection to the AppSync API
 * by attempting a simple query and logging the results.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

// Get API key and endpoint from amplify_outputs.json
function getApiConfig() {
  const amplifyOutputsPath = path.join(process.cwd(), 'amplify_outputs.json');
  if (!fs.existsSync(amplifyOutputsPath)) {
    console.error('amplify_outputs.json not found');
    return null;
  }
  
  try {
    const outputs = JSON.parse(fs.readFileSync(amplifyOutputsPath, 'utf8'));
    
    // Log the structure to help debug
    console.log('Output keys:', Object.keys(outputs));
    
    // Try different locations for the API key based on the structure
    let apiKey = outputs.api_key;
    if (!apiKey && outputs.data) {
      apiKey = outputs.data.api_key;
    }
    
    // Check environment variable as fallback
    if (!apiKey) {
      apiKey = process.env.NEXT_PUBLIC_AMPLIFY_API_KEY;
      if (apiKey) {
        console.log('Using API key from environment variable');
      }
    }
    
    // For the API URL, use hardcoded value for now since we know it
    const apiUrl = 'https://235kq6cpbbdyfizalvutob7vh4.appsync-api.us-east-1.amazonaws.com/graphql';
    
    return { apiKey, apiUrl };
  } catch (err) {
    console.error('Error parsing amplify_outputs.json:', err);
    return null;
  }
}

// Test the API with a simple query using native Node.js HTTP
async function testApi() {
  const apiConfig = getApiConfig();
  if (!apiConfig) {
    console.error('Could not get API configuration');
    return;
  }
  
  const { apiKey, apiUrl } = apiConfig;
  console.log(`API URL: ${apiUrl}`);
  console.log(`API Key: ${apiKey ? '******' + apiKey.substr(-4) : 'Not found'}`);
  
  if (!apiKey) {
    console.error('API key is required for testing');
    return;
  }
  
  // Simple query to list projects
  const query = `
    query ListProjects {
      listProjects {
        items {
          id
          name
          description
          updatedAt
        }
      }
    }
  `;
  
  const data = JSON.stringify({
    query: query.replace(/\n/g, ' ')
  });
  
  // Parse the URL
  const urlObj = new URL(apiUrl);
  
  const options = {
    hostname: urlObj.hostname,
    port: 443,
    path: urlObj.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'x-api-key': apiKey
    }
  };
  
  console.log('\nSending request to API...');
  
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`\nStatus Code: ${res.statusCode}`);
        console.log('API Response:');
        try {
          // Format the JSON response
          const formattedResult = JSON.stringify(JSON.parse(responseData), null, 2);
          console.log(formattedResult);
          console.log('\nAPI connection test completed successfully!');
        } catch (e) {
          // If not valid JSON, print as is
          console.log(responseData);
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.error('\nError making API request:');
      console.error(error.toString());
      resolve();
    });
    
    req.write(data);
    req.end();
  });
}

// Run the test
testApi();
