// Test the fixed condition logic
const testCases = [
  {
    name: "Case 1: Frontend sends testCount=3, liveCount=11",
    testCount: 3,
    liveCount: 11,
    count: 14
  },
  {
    name: "Case 2: Frontend sends testCount=0, liveCount=5", 
    testCount: 0,
    liveCount: 5,
    count: 5
  },
  {
    name: "Case 3: Frontend sends testCount=undefined, liveCount=undefined, count=10",
    testCount: undefined,
    liveCount: undefined,
    count: 10
  }
];

console.log("🧪 Testing Fixed Condition Logic\n");

testCases.forEach((testCase, index) => {
  console.log(`\n--- ${testCase.name} ---`);
  
  // Simulate the backend parsing logic
  const parsedTestCount = testCase.testCount !== undefined ? parseInt(testCase.testCount, 10) : 0;
  const parsedLiveCount = testCase.liveCount !== undefined ? parseInt(testCase.liveCount, 10) : 0;
  
  console.log(`Original values: testCount=${testCase.testCount}, liveCount=${testCase.liveCount}, count=${testCase.count}`);
  console.log(`Parsed values: parsedTestCount=${parsedTestCount}, parsedLiveCount=${parsedLiveCount}`);
  
  // Test the FIXED condition
  const fixedCondition = (testCase.testCount !== undefined && testCase.liveCount !== undefined) && (parsedTestCount > 0 || parsedLiveCount > 0);
  
  // Test the OLD broken condition for comparison
  const brokenCondition = (parsedTestCount !== undefined && parsedLiveCount !== undefined) && (parsedTestCount > 0 || parsedLiveCount > 0);
  
  console.log(`Fixed condition result: ${fixedCondition}`);
  console.log(`Broken condition result: ${brokenCondition}`);
  
  if (fixedCondition) {
    console.log(`✅ Would generate: ${parsedTestCount} test links + ${parsedLiveCount} live links = ${parsedTestCount + parsedLiveCount} total`);
  } else if (testCase.count !== undefined && testCase.count > 0) {
    console.log(`✅ Would fall back to single type generation: ${testCase.count} links`);
  } else {
    console.log(`❌ Would fail validation`);
  }
});

console.log("\n🎯 Summary:");
console.log("The fix changes the condition from checking if parsed values are undefined");
console.log("(which they never are after parseInt) to checking if the original values");
console.log("were undefined (which correctly identifies split vs single mode).");
