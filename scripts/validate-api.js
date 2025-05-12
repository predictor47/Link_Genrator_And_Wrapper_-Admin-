/**
 * Validate API connection script
 * 
 * This script tests the connection to the AppSync API
 * by attempting a simple query and logging the results.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
    
    // For the API URL, first try common locations in the outputs
    let apiUrl;
    if (outputs.data && outputs.data.GraphQLAPI && outputs.data.GraphQLAPI.endpoint) {
      apiUrl = outputs.data.GraphQLAPI.endpoint;
    } else if (outputs.GraphQLAPI && outputs.GraphQLAPI.endpoint) {
      apiUrl = outputs.GraphQLAPI.endpoint;
    } else {
      // Fallback to hardcoded URL
      apiUrl = 'https://235kq6cpbbdyfizalvutob7vh4.appsync-api.us-east-1.amazonaws.com/graphql';
    }
    
    // Clean up URL to ensure it's valid
    apiUrl = apiUrl.trim();
    
    return { apiKey, apiUrl };
  } catch (err) {
    console.error('Error parsing amplify_outputs.json:', err);
    return null;
  }
}

// Test the API with a simple query
async function testApi() {
  const apiConfig = getApiConfig();
  if (!apiConfig) {
    console.error('Could not get API configuration');
    return;
  }
  
  const { apiKey, apiUrl } = apiConfig;
  console.log(`API URL: ${apiUrl}`);
  console.log(`API Key: ${apiKey ? '******' + apiKey.substr(-4) : 'Not found'}`);
  
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
    // Check if URL is valid
  if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
    apiUrl = 'https://' + apiUrl;
  }

  // Create curl command
  // Use single quotes for URL to avoid Windows-specific issues
  const curlCommand = `curl -X POST '${apiUrl}' -H "Content-Type: application/json" -H "x-api-key: ${apiKey}" --data-raw '{"query":"${query.replace(/\n/g, ' ').replace(/"/g, '\\"')}"}'`;
  
  console.log('\nSending request to API...');
  try {
    const result = execSync(curlCommand, { encoding: 'utf8' });
    console.log('\nAPI Response:');
    try {
      // Format the JSON response
      const formattedResult = JSON.stringify(JSON.parse(result), null, 2);
      console.log(formattedResult);
      console.log('\nAPI connection test completed successfully!');
    } catch (e) {
      // If not valid JSON, print as is
      console.log(result);
    }
  } catch (error) {
    console.error('\nError making API request:');
    console.error(error.toString());
  }
}

// Run the test
testApi();
