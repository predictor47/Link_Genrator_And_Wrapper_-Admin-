const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testEnhancedLinkGeneration() {
  console.log('=== TESTING ENHANCED LINK GENERATION ===');
  
  try {
    // Test 1: Vendor Mode (Sequential IDs)
    console.log('\n1. Testing Vendor Mode (Sequential IDs)');
    
    const vendorResponse = await axios.post('http://localhost:3000/api/links/generate-enhanced', {
      projectId: 'test-enhanced-project',
      originalUrl: 'https://survey.example.com/survey?id=',
      generationMode: 'vendor',
      startRespId: 'al001',
      testCount: 3,
      liveCount: 7
    });
    
    if (vendorResponse.data.success) {
      console.log('✅ Vendor mode successful');
      console.log(`Generated: ${vendorResponse.data.count} links`);
      console.log('Sample links:');
      vendorResponse.data.links.slice(0, 3).forEach((link, i) => {
        console.log(`  ${i + 1}. ${link.respId} -> ${link.surveyUrl}`);
        console.log(`     Wrapper: ${link.wrapperUrl}`);
      });
    } else {
      console.log('❌ Vendor mode failed:', vendorResponse.data.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Internal Mode (CSV IDs)
    console.log('\n2. Testing Internal Mode (Manual CSV IDs)');
    
    const csvRespIds = ['custom001', 'custom002', 'custom003', 'special999'];
    
    const internalResponse = await axios.post('http://localhost:3000/api/links/generate-enhanced', {
      projectId: 'test-enhanced-project',
      originalUrl: 'https://survey.example.com/survey?id=',
      generationMode: 'internal',
      csvRespIds: csvRespIds
    });
    
    if (internalResponse.data.success) {
      console.log('✅ Internal mode successful');
      console.log(`Generated: ${internalResponse.data.count} links`);
      console.log('Sample links:');
      internalResponse.data.links.slice(0, 3).forEach((link, i) => {
        console.log(`  ${i + 1}. ${link.respId} -> ${link.surveyUrl}`);
      });
    } else {
      console.log('❌ Internal mode failed:', internalResponse.data.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Both Mode
    console.log('\n3. Testing Both Mode (Sequential + Custom)');
    
    const bothResponse = await axios.post('http://localhost:3000/api/links/generate-enhanced', {
      projectId: 'test-enhanced-project',
      originalUrl: 'https://survey.example.com/survey?id=',
      generationMode: 'both',
      startRespId: 'bl001',
      testCount: 2,
      liveCount: 3,
      csvRespIds: ['extra001', 'extra002']
    });
    
    if (bothResponse.data.success) {
      console.log('✅ Both mode successful');
      console.log(`Generated: ${bothResponse.data.count} links`);
      console.log('Summary:', bothResponse.data.summary);
      console.log('Sample links:');
      bothResponse.data.links.slice(0, 5).forEach((link, i) => {
        console.log(`  ${i + 1}. ${link.respId} (${link.linkType}) -> ${link.surveyUrl}`);
      });
    } else {
      console.log('❌ Both mode failed:', bothResponse.data.message);
    }
    
    console.log('\n=== ENHANCED LINK GENERATION TEST COMPLETE ===');
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status);
      console.log('Error details:', error.response.data);
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testEnhancedLinkGeneration();
