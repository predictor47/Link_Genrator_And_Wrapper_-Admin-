#!/usr/bin/env node

/**
 * Test script to verify the link generation fix
 * This simulates the API call with the correct payload structure
 */

const axios = require('axios');

async function testLinkGeneration() {
  console.log('🧪 Testing Link Generation Fix...\n');

  // Test payload that matches what the frontend would send
  const testPayload = {
    projectId: 'test-project-id',
    originalUrl: 'https://example.com/survey',
    testCount: 3,
    liveCount: 11,
    count: 14, // This should be ignored when testCount/liveCount are provided
    vendorIds: ['vendor-1', 'vendor-2'],
    generatePerVendor: true,
    useDevelopmentDomain: true
  };

  console.log('📤 Sending payload:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('\n');

  try {
    const response = await axios.post('http://localhost:3000/api/links/generate', testPayload);
    
    console.log('✅ Response received:');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    console.log('Generated links count:', response.data.count);
    
    if (response.data.links) {
      const testLinks = response.data.links.filter(link => link.linkType === 'TEST').length;
      const liveLinks = response.data.links.filter(link => link.linkType === 'LIVE').length;
      
      console.log('\n📊 Link breakdown:');
      console.log('Test links:', testLinks);
      console.log('Live links:', liveLinks);
      console.log('Total links:', response.data.links.length);
      
      // Expected: 2 vendors × (3 test + 11 live) = 28 total links
      const expectedTotal = 2 * (3 + 11); // 28 links
      const expectedTest = 2 * 3; // 6 test links
      const expectedLive = 2 * 11; // 22 live links
      
      console.log('\n🎯 Expected vs Actual:');
      console.log(`Expected total: ${expectedTotal}, Actual: ${response.data.links.length}`);
      console.log(`Expected test: ${expectedTest}, Actual: ${testLinks}`);
      console.log(`Expected live: ${expectedLive}, Actual: ${liveLinks}`);
      
      if (response.data.links.length === expectedTotal && testLinks === expectedTest && liveLinks === expectedLive) {
        console.log('\n🎉 SUCCESS: Link generation is working correctly!');
      } else {
        console.log('\n❌ ISSUE: Link counts do not match expected values');
      }
    }

  } catch (error) {
    console.log('❌ Error testing link generation:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error message:', error.response.data.message);
      console.log('Debug info:', error.response.data.debug);
    } else {
      console.log('Error:', error.message);
    }
  }
}

// Test cases
async function runTests() {
  console.log('🔬 Starting Link Generation Tests\n');
  
  // Test 1: Basic split generation with multiple vendors
  await testLinkGeneration();
  
  console.log('\n' + '='.repeat(60));
  console.log('Tests completed. Check the console output above for results.');
}

if (require.main === module) {
  runTests().catch(console.error);
}
