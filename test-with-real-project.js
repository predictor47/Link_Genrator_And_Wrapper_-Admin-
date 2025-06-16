const axios = require('axios');

async function createTestProject() {
  try {
    console.log('Creating a test project...');
    
    const response = await axios.post('http://localhost:3000/api/projects/create', {
      name: 'Test Link Generation Project',
      description: 'Project for testing link generation issue',
      originalUrl: 'https://example.com/survey'
    });
    
    console.log('Response status:', response.status);
    console.log('Project creation result:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.project) {
      const projectId = response.data.project.id;
      console.log('✅ Project created with ID:', projectId);
      return projectId;
    } else {
      console.log('❌ Failed to create project:', response.data.message);
      return null;
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Network Error:', error.message);
    }
    return null;
  }
}

async function testWithRealProject() {
  const projectId = await createTestProject();
  
  if (!projectId) {
    console.log('Cannot test link generation without a valid project');
    return;
  }
  
  console.log('\n--- Testing link generation with real project ---');
  
  try {
    const response = await axios.post('http://localhost:3000/api/links/generate', {
      projectId: projectId,
      originalUrl: 'https://example.com/survey',
      testCount: 3,
      liveCount: 11
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log(`\n✅ SUCCESS: Generated ${response.data.count} links`);
      console.log(`Expected: 14 links (3 test + 11 live)`);
      console.log(`Actual: ${response.data.count} links`);
      
      if (response.data.count !== 14) {
        console.log('❌ MISMATCH: Expected 14 links but got', response.data.count);
      } else {
        console.log('✅ CORRECT: Got expected number of links');
      }
      
      // Check link types
      const testLinks = response.data.links.filter(link => link.linkType === 'TEST');
      const liveLinks = response.data.links.filter(link => link.linkType === 'LIVE');
      
      console.log(`Test links: ${testLinks.length} (expected: 3)`);
      console.log(`Live links: ${liveLinks.length} (expected: 11)`);
      
    } else {
      console.log('❌ FAILED:', response.data.message);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

testWithRealProject();
