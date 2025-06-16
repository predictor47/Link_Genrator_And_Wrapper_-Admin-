const axios = require('axios');

async function testDatabaseSave() {
  try {
    console.log('=== TESTING DATABASE SAVE ===');
    console.log('1. First, check how many links exist before generation...');
    
    // First, get current count by trying to fetch project data
    let beforeCount = 0;
    try {
      const beforeResponse = await axios.get('http://localhost:3000/api/projects');
      console.log('Projects API response status:', beforeResponse.status);
      // For now, assume 0 existing links since we can't easily query them
      beforeCount = 0;
    } catch (error) {
      console.log('Could not fetch existing count, assuming 0');
      beforeCount = 0;
    }
    console.log(`Before generation: assuming ${beforeCount} links exist`);
    
    console.log('\n2. Generate 4 new links...');
    
    // Generate a small number of links
    const generateResponse = await axios.post('http://localhost:3000/api/links/generate', {
      projectId: 'test-project-123',
      originalUrl: 'https://example.com/survey',
      testCount: 2,
      liveCount: 2
    }, {
      timeout: 30000
    });
    
    if (!generateResponse.data.success) {
      console.log('❌ Generation failed:', generateResponse.data.message);
      return;
    }
    
    console.log(`✅ Generation reported success: ${generateResponse.data.count} links`);
    console.log('Generated link IDs:', generateResponse.data.links.map(l => l.id));
    
    console.log('\n3. Wait a moment for database consistency...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n4. Try to fetch the project to see if any links are associated...');
    
    // Check if we can fetch project data that might include link counts
    try {
      const projectResponse = await axios.get('http://localhost:3000/api/projects');
      console.log('Projects API available, status:', projectResponse.status);
    } catch (error) {
      console.log('Projects API error:', error.response?.status || error.message);
    }
    
    console.log('\n5. Analysis: Check the server logs for any database save errors...');
    console.log('Look in the server console for:');
    console.log('- "DEBUG: Successfully created survey link:" messages');
    console.log('- Any GraphQL errors during creation');
    console.log('- Batch completion messages with success counts');
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testDatabaseSave();
