const axios = require('axios');

async function testEnhancedBatching() {
  console.log('='.repeat(70));
  console.log('ENHANCED BATCHING SYSTEM TEST');
  console.log('='.repeat(70));
  
  const tests = [
    {
      name: 'Small Batch Test',
      testCount: 2,
      liveCount: 2,
      vendorIds: ['vendor1'],
      expectedTotal: 4,
      timeout: 30000
    },
    {
      name: 'Medium Batch Test',
      testCount: 10,
      liveCount: 40,
      vendorIds: ['vendor1', 'vendor2'],
      expectedTotal: 100,
      timeout: 120000
    },
    {
      name: 'Large Batch Test',
      testCount: 10,
      liveCount: 500,
      vendorIds: ['vendor1', 'vendor2'],
      expectedTotal: 1020,
      timeout: 600000 // 10 minutes
    }
  ];
  
  for (const test of tests) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Running: ${test.name}`);
    console.log(`Expected: ${test.expectedTotal} total links`);
    console.log(`Timeout: ${test.timeout/1000}s`);
    console.log(`${'='.repeat(50)}`);
    
    try {
      const startTime = Date.now();
      
      const response = await axios.post('http://localhost:3000/api/links/generate', {
        projectId: 'test-project-enhanced-batching',
        originalUrl: 'https://example.com/survey',
        testCount: test.testCount,
        liveCount: test.liveCount,
        vendorIds: test.vendorIds,
        generatePerVendor: true
      }, {
        timeout: test.timeout
      });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`\n✅ ${test.name} Results:`);
      console.log(`Duration: ${duration.toFixed(2)}s`);
      console.log(`Expected: ${test.expectedTotal} links`);
      console.log(`Actual: ${response.data.count} links`);
      console.log(`Success Rate: ${((response.data.count / test.expectedTotal) * 100).toFixed(1)}%`);
      console.log(`Performance: ${(response.data.count / duration).toFixed(1)} links/second`);
      
      if (response.data.fallbackUsed) {
        console.log(`⚠️  Fallback response was used`);
      }
      
      // Analyze link types
      const testLinks = response.data.links.filter(link => link.linkType === 'TEST');
      const liveLinks = response.data.links.filter(link => link.linkType === 'LIVE');
      
      console.log(`\nLink Type Breakdown:`);
      console.log(`TEST links: ${testLinks.length} (expected: ${test.testCount * test.vendorIds.length})`);
      console.log(`LIVE links: ${liveLinks.length} (expected: ${test.liveCount * test.vendorIds.length})`);
      
      // Analyze vendor distribution
      const vendorCounts = {};
      response.data.links.forEach(link => {
        const vendorKey = link.vendor ? link.vendor.name : 'No Vendor';
        vendorCounts[vendorKey] = (vendorCounts[vendorKey] || 0) + 1;
      });
      
      console.log(`\nVendor Distribution:`);
      Object.entries(vendorCounts).forEach(([vendor, count]) => {
        console.log(`${vendor}: ${count} links`);
      });
      
      // Success criteria
      const successRate = (response.data.count / test.expectedTotal) * 100;
      if (successRate >= 99.5) {
        console.log(`\n🎉 EXCELLENT: ${successRate.toFixed(1)}% success rate!`);
      } else if (successRate >= 95) {
        console.log(`\n✅ GOOD: ${successRate.toFixed(1)}% success rate`);
      } else {
        console.log(`\n⚠️  NEEDS IMPROVEMENT: ${successRate.toFixed(1)}% success rate`);
      }
      
      // Check for any obvious errors in link structure
      const invalidLinks = response.data.links.filter(link => 
        !link.id || !link.uid || !link.fullUrl
      );
      
      if (invalidLinks.length > 0) {
        console.log(`\n❌ Found ${invalidLinks.length} invalid links`);
      }
      
    } catch (error) {
      console.log(`\n❌ ${test.name} FAILED:`);
      
      if (error.response) {
        console.log(`API Error: ${error.response.status}`);
        if (error.response.data && typeof error.response.data === 'object') {
          console.log('Error details:', error.response.data.message || error.response.data);
        } else {
          console.log('Server returned HTML error page');
        }
      } else if (error.code === 'ECONNABORTED') {
        console.log(`Timeout Error: Request took longer than ${test.timeout/1000}s`);
      } else {
        console.log('Network Error:', error.message);
      }
    }
    
    // Wait between tests to avoid overwhelming the system
    if (test !== tests[tests.length - 1]) {
      console.log('\nWaiting 3 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('ENHANCED BATCHING TEST COMPLETED');
  console.log(`${'='.repeat(70)}`);
}

// Allow running specific tests
const testArg = process.argv[2];
if (testArg === 'small') {
  // Run just small test
  testEnhancedBatching().catch(console.error);
} else if (testArg === 'medium') {
  // Run small and medium tests
  testEnhancedBatching().catch(console.error);
} else if (testArg === 'large') {
  // Run all tests including large
  testEnhancedBatching().catch(console.error);
} else {
  // Default: run small and medium only
  testEnhancedBatching().catch(console.error);
}
