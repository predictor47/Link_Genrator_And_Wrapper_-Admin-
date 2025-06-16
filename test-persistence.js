const axios = require('axios');

async function testLinkPersistence() {
  try {
    console.log('=== TESTING LINK PERSISTENCE ===');
    
    const projectId = 'test-persistence-' + Date.now();
    console.log('Using project ID:', projectId);
    
    console.log('\n1. Generate 6 links (3 test + 3 live)...');
    
    const generateResponse = await axios.post('http://localhost:3000/api/links/generate', {
      projectId: projectId,
      originalUrl: 'https://example.com/survey',
      testCount: 3,
      liveCount: 3
    }, {
      timeout: 30000
    });
    
    if (!generateResponse.data.success) {
      console.log('❌ Generation failed:', generateResponse.data.message);
      return;
    }
    
    console.log(`✅ Generation reported success: ${generateResponse.data.count} links`);
    
    // Store the generated link IDs
    const generatedIds = generateResponse.data.links.map(link => link.id);
    const generatedUids = generateResponse.data.links.map(link => link.uid);
    
    console.log('Generated IDs:', generatedIds);
    console.log('Generated UIDs:', generatedUids);
    
    console.log('\n2. Wait 3 seconds for database consistency...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n3. Try to access individual links to test persistence...');
    
    // Test each generated link by trying to access it via the survey endpoint
    for (let i = 0; i < Math.min(3, generatedUids.length); i++) {
      const uid = generatedUids[i];
      try {
        const linkResponse = await axios.get(`http://localhost:3000/survey/${projectId}/${uid}`, {
          timeout: 10000,
          maxRedirects: 0,
          validateStatus: function (status) {
            return status < 500; // Accept redirects and client errors
          }
        });
        
        console.log(`✅ Link ${i + 1} (${uid}): Status ${linkResponse.status} - Link exists and is accessible`);
        
        if (linkResponse.status === 302 || linkResponse.status === 301) {
          console.log(`   Redirects to: ${linkResponse.headers.location}`);
        }
        
      } catch (error) {
        if (error.response) {
          console.log(`⚠️  Link ${i + 1} (${uid}): Status ${error.response.status} - ${error.response.statusText}`);
        } else if (error.code === 'ECONNABORTED') {
          console.log(`❌ Link ${i + 1} (${uid}): Timeout - link may not exist`);
        } else {
          console.log(`❌ Link ${i + 1} (${uid}): Error - ${error.message}`);
        }
      }
    }
    
    console.log('\n4. Generate more links for the same project...');
    
    const secondGenerateResponse = await axios.post('http://localhost:3000/api/links/generate', {
      projectId: projectId,
      originalUrl: 'https://example.com/survey',
      testCount: 2,
      liveCount: 2
    }, {
      timeout: 30000
    });
    
    if (secondGenerateResponse.data.success) {
      console.log(`✅ Second generation successful: ${secondGenerateResponse.data.count} more links`);
      console.log(`Total expected: ${generateResponse.data.count + secondGenerateResponse.data.count} links`);
    } else {
      console.log('❌ Second generation failed:', secondGenerateResponse.data.message);
    }
    
    console.log('\n5. Final summary:');
    console.log(`First batch: ${generateResponse.data.count} links`);
    console.log(`Second batch: ${secondGenerateResponse.data.success ? secondGenerateResponse.data.count : 0} links`);
    
    console.log('\n✅ Test completed. Check the admin UI to see if all links appear correctly.');
    console.log(`Project ID for UI check: ${projectId}`);
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testLinkPersistence();
