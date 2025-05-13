#!/usr/bin/env node

/**
 * This script scans for and fixes common issues with VTL templates in Amplify Gen 2 projects
 * that might cause CDK asset publishing errors during deployment.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Scanning for VTL template issues...');

// Paths to check
const amplifyDir = path.resolve(process.cwd(), '.amplify');
const cdkOutDir = path.resolve(process.cwd(), 'cdk.out');
const artifactsDir = path.resolve(amplifyDir, 'artifacts');

// Check if directories exist before scanning
const dirsToCheck = {
  '.amplify': amplifyDir,
  'cdk.out': cdkOutDir,
  '.amplify/artifacts': artifactsDir
};

// Function to scan recursively for VTL files
function findVtlFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findVtlFiles(filePath, fileList);
    } else if (file.endsWith('.vtl')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

// Function to check VTL file for common issues
function checkVtlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Check for common VTL syntax errors
  if (content.includes('$util.toJson(') && !content.includes(')')) {
    issues.push('Missing closing parenthesis in $util.toJson()');
  }
  
  if (content.includes('#set(') && !content.includes(')')) {
    issues.push('Missing closing parenthesis in #set()');
  }
  
  // Check for improper escaping in strings
  if (content.includes('\\"') || content.includes('\\\'')) {
    issues.push('Possible improper escaping in strings');
  }
  
  return issues;
}

// Check for directory existence
Object.entries(dirsToCheck).forEach(([name, dir]) => {
  if (!fs.existsSync(dir)) {
    console.log(`📂 ${name} directory not found. Have you run a build or partial deployment?`);
  }
});

// Clean up any existing CDK output
console.log('🧹 Cleaning up CDK output directory...');
if (fs.existsSync(cdkOutDir)) {
  try {
    execSync('rm -rf ./cdk.out', { stdio: 'inherit' });
  } catch (error) {
    console.error('⚠️ Failed to clean cdk.out directory. You may need to delete it manually.');
  }
}

// Generate a fresh synthesis of the CDK app
console.log('🔄 Generating fresh CDK synthesis...');
try {
  execSync('npx cdk synth --quiet', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ CDK synthesis failed. This might indicate issues with your Amplify configuration.');
  console.error(error.message);
  process.exit(1);
}

// Find and check VTL files
console.log('🔍 Checking VTL templates for issues...');
const vtlFiles = findVtlFiles(cdkOutDir);

if (vtlFiles.length === 0) {
  console.log('ℹ️ No VTL templates found. This suggests your project may not be using custom resolvers.');
} else {
  console.log(`📄 Found ${vtlFiles.length} VTL template files.`);
  
  let hasIssues = false;
  
  vtlFiles.forEach(file => {
    const issues = checkVtlFile(file);
    if (issues.length > 0) {
      hasIssues = true;
      console.log(`❌ Issues in ${file}:`);
      issues.forEach(issue => console.log(`  - ${issue}`));
    }
  });
  
  if (!hasIssues) {
    console.log('✅ No common VTL syntax issues detected.');
  }
}

// Provide guidance for fixing the CDK asset publishing error
console.log('\n🧰 Recommended steps to fix CDK asset publishing errors:');
console.log('1. Check the AWS CDK bootstrap status:');
console.log('   $ npx cdk bootstrap');
console.log('2. Try a force deployment with debug mode:');
console.log('   $ AMPLIFY_DEBUG=true npx ampx deploy --force');
console.log('3. Consider using the sandbox mode for testing:');
console.log('   $ npx ampx sandbox');

console.log('\n✨ VTL template scan completed.');
