const axios = require('axios');

async function testLinkGeneration() {
  try {
    console.log('Testing link generation with 3 test + 11 live links...');
    
    const response = await axios.post('http://localhost:3000/api/links/generate', {
      projectId: 'test-project-123',
      originalUrl: 'https://example.com/survey',
      testCount: 3,
      liveCount: 11
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log(`\n✅ SUCCESS: Generated ${response.data.count} links`);
      console.log(`Expected: 14 links (3 test + 11 live)`);
      console.log(`Actual: ${response.data.count} links`);
      
      if (response.data.count !== 14) {
        console.log('❌ MISMATCH: Expected 14 links but got', response.data.count);
      } else {
        console.log('✅ CORRECT: Got expected number of links');
      }
      
      // Check link types
      const testLinks = response.data.links.filter(link => link.linkType === 'TEST');
      const liveLinks = response.data.links.filter(link => link.linkType === 'LIVE');
      
      console.log(`Test links: ${testLinks.length} (expected: 3)`);
      console.log(`Live links: ${liveLinks.length} (expected: 11)`);
      
    } else {
      console.log('❌ FAILED:', response.data.message);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

testLinkGeneration();
