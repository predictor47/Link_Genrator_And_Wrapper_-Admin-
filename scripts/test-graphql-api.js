/**
 * Simple API validation script using axios
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function validateApi() {
  console.log('Amplify API validation');
  console.log('=====================\n');
  
  // Get API key from environment variable
  const apiKey = process.env.API_KEY || 'da2-sc72ftvgezh7bkmmr3xtiybby4';
  const apiUrl = 'https://235kq6cpbbdyfizalvutob7vh4.appsync-api.us-east-1.amazonaws.com/graphql';
  
  console.log(`API URL: ${apiUrl}`);
  console.log(`API Key: ${apiKey ? '******' + apiKey.substring(apiKey.length - 4) : 'Not found'}\n`);
  // Simple GraphQL query to test the API
  // Try with a query that should have public access
  const query = `
    query {
      getSurveyLink(id: "test-id") {
        id
        uid
        status
      }
    }
  `;

  try {
    console.log('Sending request to API...');
    
    const response = await axios({
      url: apiUrl,
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      data: {
        query
      }
    });
    
    console.log('\nAPI Response Status:', response.status);
    console.log('\nAPI Response Body:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Check for errors in the response
    if (response.data.errors) {
      console.error('\n⚠️ API returned errors:');
      console.error(JSON.stringify(response.data.errors, null, 2));
    } else {
      console.log('\n✅ API connection successful!');
    }
    
    // Print number of projects found
    if (response.data.data && response.data.data.listProjects) {
      const projectCount = response.data.data.listProjects.items.length;
      console.log(`\nFound ${projectCount} projects in the database.`);
    }
    
  } catch (error) {
    console.error('\n❌ Error connecting to API:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
    } else {
      // Something happened in setting up the request
      console.error('Error:', error.message);
    }
  }
}

validateApi();
