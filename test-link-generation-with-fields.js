#!/usr/bin/env node

/**
 * Test Link Generation with RespID and Vendor Internal Options
 */

const axios = require('axios');

console.log('🔗 Testing Link Generation with New Fields...\n');

const testLinkGeneration = async () => {
  try {
    // Test data
    const payload = {
      projectId: 'test-project-id',
      originalUrl: 'https://example.com/survey',
      count: 3,
      linkType: 'LIVE',
      respIdStart: 1000, // Start respid from 1000
      vendorInternal: true, // Enable vendor internal parameters
      vendorTrackingCode: 'VND_TEST_2024',
      includeVendorMetadata: true,
      enableVendorReporting: true,
      useDevelopmentDomain: true
    };

    console.log('📤 Sending request to generate links...');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Make request to the local API
    const response = await axios.post('http://localhost:3001/api/links/generate', payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('\n✅ API Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n🎉 SUCCESS: Link generation worked!');
      console.log(`Generated ${response.data.count} links`);
      
      if (response.data.links && response.data.links.length > 0) {
        console.log('\n📋 Generated Links:');
        response.data.links.forEach((link, index) => {
          console.log(`  ${index + 1}. UID: ${link.uid}`);
          console.log(`     Full URL: ${link.fullUrl}`);
          console.log(`     Status: ${link.status}`);
          
          // Parse metadata to check if respId and vendor internal settings are included
          try {
            const metadata = JSON.parse(link.metadata || '{}');
            console.log(`     RespID: ${metadata.respId || 'Not set'}`);
            console.log(`     Vendor Internal: ${metadata.vendorInternal || false}`);
            console.log(`     Vendor Tracking Code: ${metadata.vendorTrackingCode || 'None'}`);
            console.log(`     Include Vendor Metadata: ${metadata.includeVendorMetadata || false}`);
            console.log(`     Enable Vendor Reporting: ${metadata.enableVendorReporting || false}`);
          } catch (e) {
            console.log(`     Metadata: Could not parse`);
          }
          console.log('');
        });
      }
    } else {
      console.log('\n❌ FAILED: Link generation failed');
      console.log('Error:', response.data.message);
    }

  } catch (error) {
    console.error('\n💥 ERROR during link generation test:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.message);
    } else {
      console.error('Request error:', error.message);
    }
  }
};

// Run the test
testLinkGeneration().then(() => {
  console.log('\n🏁 Test completed');
}).catch((error) => {
  console.error('\n💥 Test failed:', error.message);
  process.exit(1);
});
