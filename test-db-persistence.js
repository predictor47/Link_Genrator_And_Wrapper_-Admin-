const axios = require('axios');

async function testDatabasePersistence() {
  try {
    console.log('=== TESTING DATABASE PERSISTENCE ===');
    
    // Test 1: Generate a few links
    console.log('\n1. Generating 4 test links...');
    const generateStart = Date.now();
    
    const response = await axios.post('http://localhost:3000/api/links/generate', {
      projectId: 'test-db-persistence',
      originalUrl: 'https://example.com/survey',
      testCount: 2,
      liveCount: 2
    }, {
      timeout: 30000
    });
    
    const generateTime = Date.now() - generateStart;
    console.log(`Generation completed in ${(generateTime/1000).toFixed(2)}s`);
    
    if (!response.data.success) {
      console.log('❌ Generation failed:', response.data.message);
      return;
    }
    
    console.log(`✅ API reports ${response.data.count} links generated`);
    
    // Log the generated link IDs for tracking
    const generatedIds = response.data.links.map(l => l.id);
    console.log('Generated IDs:', generatedIds);
    
    // Test 2: Try to generate again for the same project to see cumulative effect
    console.log('\n2. Generating 2 more links for the same project...');
    
    const response2 = await axios.post('http://localhost:3000/api/links/generate', {
      projectId: 'test-db-persistence',
      originalUrl: 'https://example.com/survey',
      testCount: 1,
      liveCount: 1
    }, {
      timeout: 30000
    });
    
    if (!response2.data.success) {
      console.log('❌ Second generation failed:', response2.data.message);
      return;
    }
    
    console.log(`✅ Second generation reports ${response2.data.count} more links`);
    
    const moreGeneratedIds = response2.data.links.map(l => l.id);
    console.log('Additional IDs:', moreGeneratedIds);
    
    // Total expected links
    const totalExpected = response.data.count + response2.data.count;
    console.log(`\n3. Total expected links: ${totalExpected}`);
    
    // Test 3: Check if all IDs are unique (no duplicates)
    const allIds = [...generatedIds, ...moreGeneratedIds];
    const uniqueIds = [...new Set(allIds)];
    
    if (allIds.length === uniqueIds.length) {
      console.log('✅ All generated link IDs are unique');
    } else {
      console.log(`❌ DUPLICATE IDs detected! ${allIds.length} total vs ${uniqueIds.length} unique`);
    }
    
    console.log('\n=== SUMMARY ===');
    console.log(`First batch: ${response.data.count} links`);
    console.log(`Second batch: ${response2.data.count} links`);
    console.log(`Total generated: ${totalExpected} links`);
    console.log(`Unique IDs: ${uniqueIds.length}`);
    
    // This test shows if the API is returning the right number of links
    // The question is whether they're being saved to the database
    // Check the server logs for database save confirmations
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status);
      console.log('Error message:', error.response.data?.message || 'Unknown error');
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

testDatabasePersistence();
