#!/usr/bin/env node

/**
 * Debug script to test link generation count issue
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testLinkGeneration() {
  console.log('🧪 Testing Link Generation Count Issue...');
  
  try {
    const testPayload = {
      projectId: 'test-project-id',
      originalUrl: 'https://example.com/survey',
      count: 10,
      linkType: 'LIVE',
      useDevelopmentDomain: true
    };
    
    console.log('📤 Sending payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await axios.post(`${BASE_URL}/api/links/generate`, testPayload);
    
    console.log('📥 Response received:');
    console.log('  ✅ Success:', response.data.success);
    console.log('  📊 Count returned:', response.data.count);
    console.log('  🔗 Links generated:', response.data.links?.length || 0);
    console.log('  📝 Expected count:', testPayload.count);
    
    if (response.data.links?.length !== testPayload.count) {
      console.log('❌ COUNT MISMATCH DETECTED!');
      console.log(`Expected: ${testPayload.count}, Got: ${response.data.links?.length}`);
    } else {
      console.log('✅ Count matches expected!');
    }
    
    // Test with split link types
    console.log('\n🧪 Testing Split Link Types...');
    
    const splitPayload = {
      projectId: 'test-project-id-2',
      originalUrl: 'https://example.com/survey',
      testCount: 5,
      liveCount: 5,
      useDevelopmentDomain: true
    };
    
    console.log('📤 Sending split payload:', JSON.stringify(splitPayload, null, 2));
    
    const splitResponse = await axios.post(`${BASE_URL}/api/links/generate`, splitPayload);
    
    console.log('📥 Split response received:');
    console.log('  ✅ Success:', splitResponse.data.success);
    console.log('  📊 Count returned:', splitResponse.data.count);
    console.log('  🔗 Links generated:', splitResponse.data.links?.length || 0);
    console.log('  📝 Expected total count:', splitPayload.testCount + splitPayload.liveCount);
    
    if (splitResponse.data.links?.length !== (splitPayload.testCount + splitPayload.liveCount)) {
      console.log('❌ SPLIT COUNT MISMATCH DETECTED!');
      console.log(`Expected: ${splitPayload.testCount + splitPayload.liveCount}, Got: ${splitResponse.data.links?.length}`);
    } else {
      console.log('✅ Split count matches expected!');
    }
    
  } catch (error) {
    console.error('❌ Error testing link generation:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

async function main() {
  console.log('🚀 Starting Link Generation Debug Tests...\n');
  
  // Wait a moment for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testLinkGeneration();
  
  console.log('\n🎯 Debug tests completed!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testLinkGeneration };
