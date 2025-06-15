#!/usr/bin/env node

/**
 * Simple test script to debug the link generation count issue
 */

const fs = require('fs');
const path = require('path');

// Mock request to test the API logic
const mockRequest = {
  method: 'POST',
  body: {
    projectId: 'test-project-123',
    originalUrl: 'https://example.com/survey',
    count: 10,
    linkType: 'LIVE',
    useDevelopmentDomain: true
  },
  headers: {
    'x-forwarded-for': '127.0.0.1',
    'user-agent': 'Test-Agent/1.0'
  }
};

// Mock response
const mockResponse = {
  status: (code) => ({
    json: (data) => {
      console.log(`Status: ${code}`);
      console.log('Response:', JSON.stringify(data, null, 2));
      return data;
    }
  })
};

console.log('🧪 Testing Link Generation Logic');
console.log('Mock Request:', JSON.stringify(mockRequest.body, null, 2));

// Extract the values like the API does
const { count, testCount, liveCount, generatePerVendor, vendorIds, vendorId } = mockRequest.body;

console.log('\n📊 Extracted Values:');
console.log('- count:', count, typeof count);
console.log('- testCount:', testCount, typeof testCount);
console.log('- liveCount:', liveCount, typeof liveCount);
console.log('- generatePerVendor:', generatePerVendor);
console.log('- vendorIds:', vendorIds);
console.log('- vendorId:', vendorId);

// Simulate the target vendor logic
const targetVendorIds = [];
if (generatePerVendor && vendorIds && vendorIds.length > 0) {
  targetVendorIds.push(...vendorIds);
} else if (vendorId) {
  targetVendorIds.push(vendorId);
}

console.log('- targetVendorIds:', targetVendorIds);

// Calculate expected total links
let expectedTotalLinks = 0;
if (generatePerVendor && targetVendorIds.length > 0) {
  if (testCount !== undefined && liveCount !== undefined) {
    expectedTotalLinks = (testCount + liveCount) * targetVendorIds.length;
  } else if (count) {
    expectedTotalLinks = count * targetVendorIds.length;
  }
} else {
  expectedTotalLinks = count || (testCount && liveCount ? testCount + liveCount : 0);
}

console.log('\n📈 Link Count Calculation:');
console.log('- expectedTotalLinks:', expectedTotalLinks);

// Simulate validation
console.log('\n🔍 Validation Check:');
if (!generatePerVendor) {
  if (testCount !== undefined && liveCount !== undefined) {
    const totalCount = testCount + liveCount;
    console.log('- testCount + liveCount:', totalCount);
    if (totalCount < 1 || totalCount > 10000) {
      console.log('❌ VALIDATION FAILED: Total count must be between 1 and 10,000');
    } else {
      console.log('✅ Validation passed for test/live counts');
    }
  } else if (count !== undefined) {
    console.log('- count:', count);
    if (count < 1 || count > 10000) {
      console.log('❌ VALIDATION FAILED: Count must be between 1 and 10,000');
    } else {
      console.log('✅ Validation passed for count');
    }
  } else {
    console.log('❌ VALIDATION FAILED: Count or both testCount and liveCount must be provided');
  }
}

// Simulate loop logic
console.log('\n🔄 Link Generation Simulation:');
const creationPromises = [];

if (!generatePerVendor) {
  const singleVendorId = targetVendorIds.length > 0 ? targetVendorIds[0] : undefined;
  
  if (testCount !== undefined && liveCount !== undefined) {
    console.log(`- Generating ${testCount} test links and ${liveCount} live links`);
    for (let i = 0; i < testCount; i++) {
      creationPromises.push({ type: 'TEST', index: i });
    }
    for (let i = 0; i < liveCount; i++) {
      creationPromises.push({ type: 'LIVE', index: i });
    }
  } else if (count !== undefined) {
    const linkCount = parseInt(String(count), 10);
    console.log(`- Generating ${linkCount} links of type ${mockRequest.body.linkType || 'LIVE'}`);
    
    for (let i = 0; i < linkCount; i++) {
      creationPromises.push({ type: mockRequest.body.linkType || 'LIVE', index: i });
    }
  }
}

console.log('- Total creation promises:', creationPromises.length);
console.log('- Creation promises:', creationPromises.slice(0, 5), creationPromises.length > 5 ? '...' : '');

if (creationPromises.length === parseInt(String(count), 10)) {
  console.log('✅ Correct number of links would be generated!');
} else {
  console.log('❌ Incorrect number of links would be generated!');
  console.log(`Expected: ${count}, Would generate: ${creationPromises.length}`);
}

console.log('\n🎯 Summary:');
console.log(`- Request count: ${count}`);
console.log(`- Parsed count: ${parseInt(String(count), 10)}`);
console.log(`- Links to generate: ${creationPromises.length}`);
console.log(`- Expected: ${expectedTotalLinks}`);

// Test different scenarios
console.log('\n🧪 Testing Edge Cases:');

// Test with string input (like from form)
const stringCount = "10";
console.log(`- String count "${stringCount}" parsed as:`, parseInt(stringCount, 10));

// Test with form data format
const formData = { count: "10" };
console.log(`- Form data count "${formData.count}" parsed as:`, parseInt(String(formData.count), 10));

// Test with number
const numberCount = 10;
console.log(`- Number count ${numberCount} parsed as:`, parseInt(String(numberCount), 10));
