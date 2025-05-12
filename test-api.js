/**
 * Test script for API endpoints - validates Amplify integration
 */
const fetch = require('node-fetch');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api';
const PROJECT_ID = 'test-project-id'; // Replace with an actual project ID when testing

// Try to get API key from amplify_outputs.json
let apiKey = '';
try {
  console.log('Getting API key from amplify_outputs.json...');
  const amplifyOutputsPath = path.join(process.cwd(), 'amplify_outputs.json');
  
  if (fs.existsSync(amplifyOutputsPath)) {
    console.log('Found amplify_outputs.json file');
    const amplifyOutputs = JSON.parse(fs.readFileSync(amplifyOutputsPath, 'utf8'));
    
    // API key is directly in the root object in the latest format
    if (amplifyOutputs.api_key) {
      console.log('Using API key from Amplify outputs root');
      apiKey = amplifyOutputs.api_key;
    } else if (amplifyOutputs.data && amplifyOutputs.data.api_key) {
      // Check if it's nested under the data property
      console.log('Using API key from Amplify outputs data section');
      apiKey = amplifyOutputs.data.api_key;
    } else {
      console.warn('API key not found in expected locations in amplify_outputs.json');
      console.log('Available keys:', Object.keys(amplifyOutputs));
    }
  } else {
    console.warn('amplify_outputs.json file not found');
  }
} catch (error) {
  console.warn('Could not get API key:', error.message);
}

async function testVendorsEndpoint() {
  console.log('Testing vendors API endpoint...');  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    const response = await fetch(`${BASE_URL}/vendors/list?projectId=${PROJECT_ID}`, { headers });
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error testing vendors endpoint:', error.message);
    return null;
  }
}

async function testProjectsEndpoint() {
  console.log('Testing projects API endpoint...');  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    // Create a test project
    const createResponse = await fetch(`${BASE_URL}/projects/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test Project',
        description: 'Created via test script'
      })
    });
    
    const createData = await createResponse.json();
    console.log('Create Project Response:', JSON.stringify(createData, null, 2));
    
    if (createData.data && createData.data.id) {
      // If creation was successful, try to fetch the project
      console.log(`Testing project fetch for ID: ${createData.data.id}`);
      const getResponse = await fetch(`${BASE_URL}/projects/${createData.data.id}/questions`, { headers });
      const getData = await getResponse.json();
      console.log('Get Project Response:', JSON.stringify(getData, null, 2));
    }
    
    return createData;
  } catch (error) {
    console.error('Error testing projects endpoint:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('Starting API endpoint tests...');
  
  // Test endpoints
  await testVendorsEndpoint();
  await testProjectsEndpoint();
  
  console.log('API tests completed');
}

// Run the tests
runTests();
