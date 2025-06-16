const axios = require('axios');

async function testLargeBatchGeneration() {
  try {
    console.log('Testing large batch link generation...');
    console.log('Scenario: 10 test + 500 live links for 2 vendors = 1,020 total links');
    
    const startTime = Date.now();
    
    const response = await axios.post('http://localhost:3000/api/links/generate', {
      projectId: 'test-project-123',
      originalUrl: 'https://example.com/survey',
      testCount: 10,
      liveCount: 500,
      vendorIds: ['vendor1', 'vendor2'],
      generatePerVendor: true
    }, {
      timeout: 300000 // 5 minute timeout for large batch
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('Response status:', response.status);
    console.log(`Request completed in ${duration.toFixed(2)} seconds`);
    
    if (response.data.success) {
      console.log(`\n✅ SUCCESS: Generated ${response.data.count} links`);
      console.log(`Expected: 1,020 links (510 per vendor × 2 vendors)`);
      console.log(`Actual: ${response.data.count} links`);
      
      // Check link types
      const testLinks = response.data.links.filter(link => link.linkType === 'TEST');
      const liveLinks = response.data.links.filter(link => link.linkType === 'LIVE');
      
      console.log(`\nLink Type Breakdown:`);
      console.log(`Test links: ${testLinks.length} (expected: 20 = 10 × 2 vendors)`);
      console.log(`Live links: ${liveLinks.length} (expected: 1,000 = 500 × 2 vendors)`);
      
      // Check vendor distribution
      const vendor1Links = response.data.links.filter(link => 
        link.uid && (link.uid.includes('vendor1') || link.uid.includes('V1'))
      );
      const vendor2Links = response.data.links.filter(link => 
        link.uid && (link.uid.includes('vendor2') || link.uid.includes('V2'))
      );
      
      console.log(`\nVendor Distribution:`);
      console.log(`Vendor 1 links: ${vendor1Links.length} (expected: 510)`);
      console.log(`Vendor 2 links: ${vendor2Links.length} (expected: 510)`);
      
      if (response.data.count === 1020) {
        console.log('\n🎉 PERFECT: Got exactly the expected number of links!');
        console.log(`Performance: ${(1020 / duration).toFixed(1)} links/second`);
      } else {
        console.log(`\n❌ MISMATCH: Expected 1,020 links but got ${response.data.count}`);
      }
      
    } else {
      console.log('❌ FAILED:', response.data.message);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status);
      console.log('Error details:', error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      console.log('❌ Timeout Error: Request took too long (>5 minutes)');
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

async function testMediumBatch() {
  try {
    console.log('\n--- Testing medium batch (100 links total) ---');
    
    const startTime = Date.now();
    
    const response = await axios.post('http://localhost:3000/api/links/generate', {
      projectId: 'test-project-123',
      originalUrl: 'https://example.com/survey',
      testCount: 10,
      liveCount: 40,
      vendorIds: ['vendor1', 'vendor2'],
      generatePerVendor: true
    }, {
      timeout: 60000 // 1 minute timeout
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`Medium batch completed in ${duration.toFixed(2)} seconds`);
    
    if (response.data.success) {
      console.log(`✅ Generated ${response.data.count} links (expected: 100)`);
      console.log(`Performance: ${(response.data.count / duration).toFixed(1)} links/second`);
    } else {
      console.log('❌ Failed:', response.data.message);
    }
    
  } catch (error) {
    console.log('❌ Medium batch failed:', error.message);
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('BATCHED LINK GENERATION PERFORMANCE TEST');
  console.log('='.repeat(60));
  
  // Start with medium batch to test the system
  await testMediumBatch();
  
  // Give a moment between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Then try the large batch
  console.log('\n' + '='.repeat(60));
  await testLargeBatchGeneration();
}

runTests().catch(console.error);
