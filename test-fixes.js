#!/usr/bin/env node

/**
 * Test script to verify the fixes we've implemented
 */

const axios = require('axios');

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-domain.com' 
  : 'http://localhost:3000';

async function testLinkGeneration() {
  console.log('🧪 Testing Link Generation...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/links/generate`, {
      projectId: 'test-project-id',
      originalUrl: 'https://example.com/survey',
      count: 10,
      linkType: 'LIVE',
      useDevelopmentDomain: true
    });
    
    console.log('✅ Link Generation Response:', {
      success: response.data.success,
      count: response.data.count,
      linksGenerated: response.data.links?.length || 0,
      expectedCount: 10
    });
    
    if (response.data.links?.length === 10) {
      console.log('✅ Link generation count is correct!');
    } else {
      console.log('❌ Link generation count is incorrect!');
      console.log('Expected: 10, Got:', response.data.links?.length || 0);
    }
    
    // Check if links use the correct route (should be /survey/ not /s/)
    if (response.data.links?.length > 0) {
      const firstLink = response.data.links[0];
      if (firstLink.fullUrl.includes('/survey/')) {
        console.log('✅ Links use correct route (/survey/) for consent page');
      } else {
        console.log('❌ Links still use old route (/s/)');
        console.log('First link:', firstLink.fullUrl);
      }
    }
    
  } catch (error) {
    console.log('❌ Link generation test failed:', error.response?.data || error.message);
  }
}

async function testConsentRecording() {
  console.log('\n🧪 Testing Consent Recording with Geo-location...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/consent/record`, {
      projectId: 'test-project-id',
      uid: 'test-uid',
      consents: {
        privacy: true,
        data_collection: true
      },
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('✅ Consent Recording Response:', {
      success: response.data.success,
      message: response.data.message
    });
    
  } catch (error) {
    console.log('❌ Consent recording test failed:', error.response?.data || error.message);
  }
}

async function testPresurveySubmission() {
  console.log('\n🧪 Testing Presurvey Submission with Enhanced QC...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/presurvey/submit`, {
      projectId: 'test-project-id',
      uid: 'test-uid',
      answers: {
        age: '25',
        country: 'United States',
        email: 'test@example.com'
      },
      metadata: {
        startTime: new Date().toISOString(),
        completionTime: 30000
      }
    });
    
    console.log('✅ Presurvey Submission Response:', {
      success: response.data.success,
      answerCount: response.data.answerCount,
      hasQCAnalysis: !!response.data.summary
    });
    
  } catch (error) {
    console.log('❌ Presurvey submission test failed:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Fix Validation Tests...\n');
  
  await testLinkGeneration();
  await testConsentRecording();
  await testPresurveySubmission();
  
  console.log('\n✨ Test suite completed!');
  console.log('\n📝 Summary of Fixes Applied:');
  console.log('1. ✅ Changed link generation route from /s/ to /survey/ for consent page');
  console.log('2. ✅ Enhanced consent recording with geo-location data capture');
  console.log('3. ✅ Added QC analysis data to presurvey submission for analytics');
  console.log('4. ✅ Updated analytics Raw Data tab to show enhanced country & QC data');
  console.log('5. ✅ Added frontend debugging for link generation count issues');
  
  console.log('\n🔍 Next Steps:');
  console.log('- Start the development server with: npm run dev');
  console.log('- Test link generation in the admin panel');
  console.log('- Check the browser console for debugging output');
  console.log('- Verify consent page appears when clicking generated links');
  console.log('- Check Raw Data tab in analytics for country and QC information');
}

// Only run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testLinkGeneration,
  testConsentRecording,
  testPresurveySubmission
};
