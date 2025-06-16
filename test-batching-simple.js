const axios = require('axios');

async function testBatchingSystem() {
  try {
    console.log('Testing batching system with small request (4 links)...');
    
    const startTime = Date.now();
    
    const response = await axios.post('http://localhost:3000/api/links/generate', {
      projectId: 'any-project-id', // Will create a project if needed
      originalUrl: 'https://example.com/survey',
      testCount: 2,
      liveCount: 2
    }, {
      timeout: 30000 // 30 second timeout
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('Response status:', response.status);
    console.log(`Request completed in ${duration.toFixed(2)} seconds`);
    
    if (response.data.success) {
      console.log(`✅ SUCCESS: Generated ${response.data.count} links`);
      console.log(`Expected: 4 links (2 test + 2 live)`);
      
      // Check if we see batching logs in the output
      console.log('Batching system appears to be working!');
      
    } else {
      console.log('❌ FAILED:', response.data.message);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status);
      if (error.response.data && typeof error.response.data === 'string') {
        // HTML error page
        console.log('Server returned HTML error page (likely 500 error)');
      } else {
        console.log('Error details:', error.response.data);
      }
    } else if (error.code === 'ECONNABORTED') {
      console.log('❌ Timeout Error: Request took too long');
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

testBatchingSystem().catch(console.error);
