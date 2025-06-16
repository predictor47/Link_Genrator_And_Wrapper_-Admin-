const axios = require('axios');

async function testMediumBatch() {
  try {
    console.log('Testing medium batch (100 links total)...');
    
    const startTime = Date.now();
    
    const response = await axios.post('http://localhost:3000/api/links/generate', {
      projectId: 'test-project-123',
      originalUrl: 'https://example.com/survey',
      testCount: 10,
      liveCount: 40,
      vendorIds: ['vendor1', 'vendor2'],
      generatePerVendor: true
    }, {
      timeout: 60000
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`Medium batch completed in ${duration.toFixed(2)} seconds`);
    
    if (response.data.success) {
      console.log(`✅ Generated ${response.data.count} links (expected: 100)`);
      console.log(`Performance: ${(response.data.count / duration).toFixed(1)} links/second`);
      
      const testLinks = response.data.links.filter(link => link.linkType === 'TEST');
      const liveLinks = response.data.links.filter(link => link.linkType === 'LIVE');
      console.log(`Test links: ${testLinks.length} (expected: 20)`);
      console.log(`Live links: ${liveLinks.length} (expected: 80)`);
      
      if (response.data.count === 100) {
        console.log('🎉 Perfect: Got exactly the expected number of links!');
      } else {
        console.log(`❌ Mismatch: Expected 100 but got ${response.data.count}`);
      }
    } else {
      console.log('❌ Failed:', response.data.message);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status);
      console.log('Error details:', error.response.data);
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testMediumBatch();
