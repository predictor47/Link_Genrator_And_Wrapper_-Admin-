const axios = require('axios');

async function testDatabaseOperations() {
  console.log('=== STEP-BY-STEP DATABASE OPERATION TEST ===');
  
  try {
    const projectId = `test-debug-${Date.now()}`;
    console.log(`\n1. Testing project creation with ID: ${projectId}`);
    
    // Try to create a project first
    const projectResponse = await axios.post('http://localhost:3000/api/projects/create', {
      name: 'Debug Test Project',
      description: 'Testing database operations',
      originalUrl: 'https://example.com/test'
    });
    
    if (projectResponse.data.success) {
      console.log('✅ Project creation API succeeded');
      console.log('Project ID returned:', projectResponse.data.project?.id);
      
      const actualProjectId = projectResponse.data.project?.id || projectId;
      
      console.log(`\n2. Testing link generation for project: ${actualProjectId}`);
      
      // Now try to generate links for this project
      const linkResponse = await axios.post('http://localhost:3000/api/links/generate', {
        projectId: actualProjectId,
        originalUrl: 'https://example.com/survey',
        testCount: 2,
        liveCount: 2
      });
      
      if (linkResponse.data.success) {
        console.log('✅ Link generation API succeeded');
        console.log(`Generated ${linkResponse.data.count} links`);
        console.log('Link IDs:', linkResponse.data.links.map(l => l.id));
        
        console.log('\n3. Waiting for database propagation...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n4. Testing if we can fetch the project...');
        
        // Try to fetch projects list
        try {
          const listResponse = await axios.get('http://localhost:3000/api/projects');
          
          if (listResponse.data.success) {
            const projects = listResponse.data.projects || [];
            console.log(`Found ${projects.length} total projects`);
            
            const ourProject = projects.find(p => p.id === actualProjectId);
            if (ourProject) {
              console.log('✅ Our project found in database!');
              console.log('Project details:', {
                id: ourProject.id,
                name: ourProject.name,
                createdAt: ourProject.createdAt
              });
            } else {
              console.log('❌ Our project NOT found in database');
              console.log('Available project IDs:', projects.map(p => p.id).slice(0, 5));
            }
          } else {
            console.log('❌ Failed to fetch projects list');
          }
        } catch (listError) {
          console.log('❌ Error fetching projects:', listError.response?.status || listError.message);
        }
        
      } else {
        console.log('❌ Link generation failed:', linkResponse.data.message);
      }
      
    } else {
      console.log('❌ Project creation failed:', projectResponse.data.message);
    }
    
  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testDatabaseOperations();
