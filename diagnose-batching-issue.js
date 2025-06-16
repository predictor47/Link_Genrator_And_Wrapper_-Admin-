const axios = require('axios');

/**
 * Diagnostic script to identify the cause of missing links in large batch operations
 */

async function testServerHealth() {
  try {
    console.log('Testing server health...');
    const response = await axios.get('http://localhost:3000', { timeout: 5000 });
    console.log('✅ Server is responding');
    return true;
  } catch (error) {
    console.log('❌ Server health check failed:', error.message);
    return false;
  }
}

async function testSmallBatch() {
  try {
    console.log('\n=== SMALL BATCH TEST (4 links) ===');
    
    const startTime = Date.now();
    const response = await axios.post('http://localhost:3000/api/links/generate', {
      projectId: 'test-project-small',
      originalUrl: 'https://example.com/survey',
      testCount: 2,
      liveCount: 2
    }, { timeout: 30000 });
    
    const duration = (Date.now() - startTime) / 1000;
    
    if (response.data.success) {
      console.log(`✅ SUCCESS: ${response.data.count}/4 links created in ${duration.toFixed(2)}s`);
      return { success: true, created: response.data.count, expected: 4 };
    } else {
      console.log('❌ FAILED:', response.data.message);
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

async function testMediumBatch() {
  try {
    console.log('\n=== MEDIUM BATCH TEST (100 links) ===');
    
    const startTime = Date.now();
    const response = await axios.post('http://localhost:3000/api/links/generate', {
      projectId: 'test-project-medium',
      originalUrl: 'https://example.com/survey',
      testCount: 10,
      liveCount: 40,
      vendorIds: ['vendor1', 'vendor2'],
      generatePerVendor: true
    }, { timeout: 120000 });
    
    const duration = (Date.now() - startTime) / 1000;
    
    if (response.data.success) {
      const rate = (response.data.count / duration).toFixed(1);
      console.log(`✅ SUCCESS: ${response.data.count}/100 links created in ${duration.toFixed(2)}s (${rate} links/sec)`);
      
      // Analyze link distribution
      const testLinks = response.data.links.filter(link => link.linkType === 'TEST');
      const liveLinks = response.data.links.filter(link => link.linkType === 'LIVE');
      
      console.log(`   TEST links: ${testLinks.length}/20 (expected: 20)`);
      console.log(`   LIVE links: ${liveLinks.length}/80 (expected: 80)`);
      
      return { 
        success: true, 
        created: response.data.count, 
        expected: 100,
        testLinks: testLinks.length,
        liveLinks: liveLinks.length,
        rate: parseFloat(rate)
      };
    } else {
      console.log('❌ FAILED:', response.data.message);
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

async function testLargeBatch() {
  try {
    console.log('\n=== LARGE BATCH TEST (1020 links) ===');
    console.log('Configuration: 10 test + 500 live per vendor × 2 vendors');
    
    const startTime = Date.now();
    const response = await axios.post('http://localhost:3000/api/links/generate', {
      projectId: 'test-project-large',
      originalUrl: 'https://example.com/survey',
      testCount: 10,
      liveCount: 500,
      vendorIds: ['vendor1', 'vendor2'],
      generatePerVendor: true
    }, { timeout: 300000 }); // 5 minute timeout
    
    const duration = (Date.now() - startTime) / 1000;
    
    if (response.data.success) {
      const rate = (response.data.count / duration).toFixed(1);
      const successRate = ((response.data.count / 1020) * 100).toFixed(1);
      
      console.log(`✅ COMPLETED: ${response.data.count}/1020 links created in ${duration.toFixed(2)}s (${rate} links/sec)`);
      console.log(`   Success rate: ${successRate}%`);
      
      if (response.data.count < 1020) {
        const missing = 1020 - response.data.count;
        console.log(`⚠️  MISSING: ${missing} links (${((missing/1020)*100).toFixed(1)}% failed)`);
      }
      
      // Analyze link distribution
      const testLinks = response.data.links.filter(link => link.linkType === 'TEST');
      const liveLinks = response.data.links.filter(link => link.linkType === 'LIVE');
      
      console.log(`   TEST links: ${testLinks.length}/20 (expected: 20)`);
      console.log(`   LIVE links: ${liveLinks.length}/1000 (expected: 1000)`);
      
      // Vendor distribution analysis
      const vendor1Links = response.data.links.filter(link => 
        link.uid && (link.uid.includes('vendor1') || link.uid.includes('V1'))
      );
      const vendor2Links = response.data.links.filter(link => 
        link.uid && (link.uid.includes('vendor2') || link.uid.includes('V2'))
      );
      
      console.log(`   Vendor 1: ${vendor1Links.length}/510 (expected: 510)`);
      console.log(`   Vendor 2: ${vendor2Links.length}/510 (expected: 510)`);
      
      return { 
        success: true, 
        created: response.data.count, 
        expected: 1020,
        missing: 1020 - response.data.count,
        successRate: parseFloat(successRate),
        testLinks: testLinks.length,
        liveLinks: liveLinks.length,
        vendor1: vendor1Links.length,
        vendor2: vendor2Links.length,
        rate: parseFloat(rate)
      };
    } else {
      console.log('❌ FAILED:', response.data.message);
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

async function runDiagnostics() {
  console.log('='.repeat(60));
  console.log('BATCHING SYSTEM DIAGNOSTIC ANALYSIS');
  console.log('='.repeat(60));
  
  // Check server health
  const serverHealthy = await testServerHealth();
  if (!serverHealthy) {
    console.log('\n❌ Cannot proceed - server is not responding');
    process.exit(1);
  }
  
  const results = {};
  
  // Test progression: small -> medium -> large
  results.small = await testSmallBatch();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  results.medium = await testMediumBatch();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  results.large = await testLargeBatch();
  
  // Summary analysis
  console.log('\n' + '='.repeat(60));
  console.log('DIAGNOSTIC SUMMARY');
  console.log('='.repeat(60));
  
  if (results.small.success) {
    console.log(`✅ Small batch: ${results.small.created}/${results.small.expected} (100%)`);
  } else {
    console.log(`❌ Small batch: Failed - ${results.small.error}`);
  }
  
  if (results.medium.success) {
    const mediumRate = ((results.medium.created / results.medium.expected) * 100).toFixed(1);
    console.log(`✅ Medium batch: ${results.medium.created}/${results.medium.expected} (${mediumRate}%) - ${results.medium.rate} links/sec`);
  } else {
    console.log(`❌ Medium batch: Failed - ${results.medium.error}`);
  }
  
  if (results.large.success) {
    console.log(`⚠️  Large batch: ${results.large.created}/${results.large.expected} (${results.large.successRate}%) - ${results.large.rate} links/sec`);
    if (results.large.missing > 0) {
      console.log(`   → ${results.large.missing} links missing - this is the issue to fix!`);
    }
  } else {
    console.log(`❌ Large batch: Failed - ${results.large.error}`);
  }
  
  // Recommendations
  console.log('\n' + '='.repeat(60));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(60));
  
  if (results.large.success && results.large.missing > 0) {
    console.log('🔍 ISSUE IDENTIFIED: Large batches are losing some links during processing');
    console.log('📋 Potential causes to investigate:');
    console.log('   1. Database timeouts during batch operations');
    console.log('   2. Promise resolution failures in individual link creation');
    console.log('   3. Memory pressure causing some operations to fail silently');
    console.log('   4. Race conditions in concurrent batch processing');
    console.log('   5. GraphQL/AppSync request throttling or limits');
    
    console.log('\n💡 Next steps:');
    console.log('   1. Check server logs for error patterns during large batch processing');
    console.log('   2. Add more detailed error logging to individual link creation promises');
    console.log('   3. Implement retry logic for failed individual link creations');
    console.log('   4. Consider reducing batch size or increasing delays for large operations');
  } else if (results.large.success && results.large.missing === 0) {
    console.log('🎉 EXCELLENT: All batch sizes are working perfectly!');
  } else {
    console.log('🔧 NEEDS INVESTIGATION: Large batch test failed completely');
  }
  
  console.log('\n📊 Performance summary:');
  if (results.medium.success && results.large.success) {
    console.log(`   Medium batch rate: ${results.medium.rate} links/sec`);
    console.log(`   Large batch rate: ${results.large.rate} links/sec`);
    
    if (results.large.rate < results.medium.rate * 0.7) {
      console.log('   ⚠️  Performance degrades significantly with larger batches');
    } else {
      console.log('   ✅ Performance scales reasonably well');
    }
  }
}

runDiagnostics().catch(console.error);
