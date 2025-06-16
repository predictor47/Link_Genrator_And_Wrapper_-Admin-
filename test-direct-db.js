// Direct test of the AmplifyServerService to see if database saves work
const { getAmplifyServerService } = require('./src/lib/amplify-server-service.ts');

async function testDirectDatabaseSave() {
  try {
    console.log('=== DIRECT DATABASE SAVE TEST ===');
    
    const amplifyServerService = getAmplifyServerService();
    console.log('✅ AmplifyServerService initialized');
    
    // Try to create a single test link
    const testLinkData = {
      projectId: 'test-project-direct',
      uid: 'TEST_' + Date.now(),
      status: 'UNUSED',
      metadata: JSON.stringify({
        originalUrl: 'https://example.com/test',
        linkType: 'TEST',
        testMode: true
      })
    };
    
    console.log('Attempting to create link with data:', testLinkData);
    
    const result = await amplifyServerService.createSurveyLink(testLinkData);
    
    if (result.data) {
      console.log('✅ SUCCESS: Link created successfully!');
      console.log('Created link ID:', result.data.id);
      console.log('Created link UID:', result.data.uid);
      
      // Try to fetch it back
      console.log('\nAttempting to fetch the created link...');
      try {
        const fetchResult = await amplifyServerService.listSurveyLinksByProject('test-project-direct');
        console.log('Fetch result:', fetchResult.data ? `${fetchResult.data.length} links found` : 'No data');
        
        if (fetchResult.data && fetchResult.data.length > 0) {
          const foundLink = fetchResult.data.find(link => link.id === result.data.id);
          if (foundLink) {
            console.log('✅ SUCCESS: Link was found in database!');
          } else {
            console.log('❌ ISSUE: Link was created but not found in project query');
          }
        } else {
          console.log('❌ ISSUE: No links found for project');
        }
      } catch (fetchError) {
        console.log('❌ Error fetching link:', fetchError.message);
      }
      
    } else {
      console.log('❌ FAILURE: Link creation returned no data');
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testDirectDatabaseSave();
