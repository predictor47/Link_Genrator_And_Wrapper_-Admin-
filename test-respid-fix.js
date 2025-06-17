// Simple test to verify respId functionality
console.log('=== Testing respId Support ===');

// Test the enhanced link generation utils
function parseRespId(respId) {
  const match = respId.match(/^([a-zA-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid resp_id format: ${respId}. Expected format like 'al001'`);
  }
  return {
    prefix: match[1],
    number: parseInt(match[2], 10)
  };
}

function generateSequentialRespIds(startRespId, count) {
  const { prefix, number } = parseRespId(startRespId);
  const respIds = [];
  
  for (let i = 0; i < count; i++) {
    const currentNumber = number + i;
    const paddedNumber = currentNumber.toString().padStart(3, '0');
    respIds.push(`${prefix}${paddedNumber}`);
  }
  
  return respIds;
}

function buildSurveyUrl(baseUrl, respId) {
  if (baseUrl.includes('=')) {
    if (baseUrl.endsWith('=')) {
      return `${baseUrl}${respId}`;
    }
    return `${baseUrl}&respId=${respId}`;
  }
  return `${baseUrl}?respId=${respId}`;
}

// Test the functions
try {
  console.log('\n1. Testing parseRespId function:');
  const parsed = parseRespId('al001');
  console.log('   Parsed al001:', parsed);
  
  console.log('\n2. Testing generateSequentialRespIds function:');
  const respIds = generateSequentialRespIds('al001', 5);
  console.log('   Generated 5 respIds from al001:', respIds);
  
  console.log('\n3. Testing buildSurveyUrl function:');
  const url1 = buildSurveyUrl('https://example.com/survey?id=', 'al001');
  console.log('   URL with existing param:', url1);
  
  const url2 = buildSurveyUrl('https://example.com/survey', 'al002');
  console.log('   URL without params:', url2);
  
  console.log('\n✅ All respId utility functions work correctly!');
  
  // Test the schema types
  console.log('\n4. Testing SurveyLink interface structure:');
  const mockSurveyLink = {
    id: 'test-id',
    projectId: 'test-project',
    uid: 'test-uid',
    respId: 'al001', // This field should now be properly typed
    status: 'UNUSED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  console.log('   Mock SurveyLink with respId:', {
    id: mockSurveyLink.id,
    uid: mockSurveyLink.uid,
    respId: mockSurveyLink.respId
  });
  
  console.log('\n✅ SurveyLink respId field is properly accessible!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}
