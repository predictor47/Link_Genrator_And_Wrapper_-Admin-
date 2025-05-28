const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testLinkGenerateAPI() {
  console.log('🧪 Testing Link Generation API...\n');

  try {
    // First, let's try to create a test project using the existing API
    console.log('1. Testing API endpoints availability...');
    
    // Test with a simple request first
    const testResponse = await axios.post(`${API_BASE}/links/generate`, {
      projectId: 'test-project-id',
      originalUrl: 'https://example.com/survey',
      count: 1
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: function (status) {
        return status < 600; // Accept all status codes below 600
      }
    });
    
    console.log('Response Status:', testResponse.status);
    console.log('Response Data:', JSON.stringify(testResponse.data, null, 2));
    
    if (testResponse.status === 404) {
      console.log('\n✅ API endpoint responded correctly - project not found (expected)');
    } else if (testResponse.status === 200) {
      console.log('\n✅ API endpoint worked successfully!');
    } else {
      console.log('\n⚠️ Unexpected response status');
    }

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

async function testWithValidData() {
  console.log('\n🔍 Testing with different data combinations...\n');
  
  const testCases = [
    {
      name: 'Missing required fields',
      data: {
        count: 1
      }
    },
    {
      name: 'Invalid count',
      data: {
        projectId: 'test-id',
        originalUrl: 'https://example.com',
        count: 0
      }
    },
    {
      name: 'Valid data with non-existent project',
      data: {
        projectId: 'non-existent-project-id',
        originalUrl: 'https://example.com/survey',
        count: 5,
        linkType: 'TEST'
      }
    },
    {
      name: 'Valid data with test/live counts',
      data: {
        projectId: 'test-project-id',
        originalUrl: 'https://example.com/survey',
        testCount: 3,
        liveCount: 2,
        geoRestriction: ['US', 'CA']
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    try {
      const response = await axios.post(`${API_BASE}/links/generate`, testCase.data, {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: function (status) {
          return status < 600;
        }
      });
      
      console.log(`  Status: ${response.status}`);
      console.log(`  Message: ${response.data.message || 'No message'}`);
      console.log(`  Success: ${response.data.success}`);
      
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
    console.log('');
  }
}

// Run the tests
testLinkGenerateAPI()
  .then(() => testWithValidData())
  .then(() => {
    console.log('✅ All tests completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
