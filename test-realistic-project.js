const axios = require('axios');

async function testWithRealisticProjectId() {
  try {
    console.log('=== TESTING WITH REALISTIC PROJECT ID ===');
    
    // Use a more realistic project ID format
    const projectId = `proj-${Date.now()}`;
    console.log('Using project ID:', projectId);
    
    const response = await axios.post('http://localhost:3000/api/links/generate', {
      projectId: projectId,
      originalUrl: 'https://example.com/survey',
      testCount: 2,
      liveCount: 2
    }, {
      timeout: 30000
    });
    
    if (response.data.success) {
      console.log(`✅ Generated ${response.data.count} links`);
      console.log('Link IDs:', response.data.links.map(l => l.id));
      console.log('\n🔍 Check server logs for:');
      console.log('- List query debugging output');
      console.log('- Whether links are found in the list query');
      console.log('- Any GraphQL filter issues');
    } else {
      console.log('❌ Generation failed:', response.data.message);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status || error.message);
  }
}

testWithRealisticProjectId();
