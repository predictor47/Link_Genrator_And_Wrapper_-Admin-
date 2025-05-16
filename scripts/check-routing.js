// A simple script to check Next.js routing and Amplify configuration

const fs = require('fs');
const path = require('path');

console.log('🔍 Next.js Routing & Amplify Configuration Diagnostic Tool');
console.log('--------------------------------------------------------');

// Check if we have important directories
function checkDirectory(dir) {
  try {
    const stats = fs.statSync(dir);
    return stats.isDirectory();
  } catch (e) {
    return false;
  }
}

console.log('🗂️  Checking project structure...');
const hasPages = checkDirectory(path.join(process.cwd(), 'src', 'pages'));
const hasPublic = checkDirectory(path.join(process.cwd(), 'public'));
const hasAmplify = checkDirectory(path.join(process.cwd(), 'amplify'));

console.log(`  - Pages directory: ${hasPages ? '✅' : '❌'}`);
console.log(`  - Public directory: ${hasPublic ? '✅' : '❌'}`);
console.log(`  - Amplify directory: ${hasAmplify ? '✅' : '❌'}`);

// Check if we have important files
function checkFile(file) {
  try {
    const stats = fs.statSync(file);
    return stats.isFile();
  } catch (e) {
    return false;
  }
}

console.log('\n📄 Checking critical files...');
const hasNextConfig = checkFile(path.join(process.cwd(), 'next.config.js'));
const hasAmplifyYml = checkFile(path.join(process.cwd(), 'amplify.yml'));
const hasAmplifyOutputs = checkFile(path.join(process.cwd(), 'amplify_outputs.json'));
const hasMiddleware = checkFile(path.join(process.cwd(), 'src', 'middleware.ts'));
const hasLoginPage = checkFile(path.join(process.cwd(), 'src', 'pages', 'admin', 'login.tsx'));

console.log(`  - next.config.js: ${hasNextConfig ? '✅' : '❌'}`);
console.log(`  - amplify.yml: ${hasAmplifyYml ? '✅' : '❌'}`);
console.log(`  - amplify_outputs.json: ${hasAmplifyOutputs ? '✅' : '❌'}`);
console.log(`  - middleware.ts: ${hasMiddleware ? '✅' : '❌'}`);
console.log(`  - admin/login.tsx: ${hasLoginPage ? '✅' : '❌'}`);

// Check Amplify outputs
let amplifyOutputs = null;
if (hasAmplifyOutputs) {
  try {
    const outputsContent = fs.readFileSync(path.join(process.cwd(), 'amplify_outputs.json'), 'utf8');
    amplifyOutputs = JSON.parse(outputsContent);
    console.log('\n⚙️  Amplify Output Values:');
    console.log(`  - UserPool ID: ${amplifyOutputs?.auth?.user_pool_id || 'Not found'}`);
    console.log(`  - API Endpoint: ${amplifyOutputs?.data?.url || 'Not found'}`);
    console.log(`  - API Key: ${amplifyOutputs?.data?.api_key ? 'Present' : 'Not found'}`);
  } catch (e) {
    console.log('\n❌ Error parsing amplify_outputs.json:', e.message);
  }
}

// Check env variables
console.log('\n🔐 Environment Variables:');
const envVars = [
  'NEXT_PUBLIC_AUTH_USER_POOL_ID',
  'NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID',
  'NEXT_PUBLIC_AUTH_IDENTITY_POOL_ID',
  'NEXT_PUBLIC_API_ENDPOINT',
  'NEXT_PUBLIC_AMPLIFY_API_KEY',
  'NEXT_PUBLIC_DOMAIN',
  'NEXT_PUBLIC_ADMIN_DOMAIN'
];

for (const variable of envVars) {
  console.log(`  - ${variable}: ${process.env[variable] ? '✅' : '❌'}`);
}

console.log('\n📋 Routing Recommendations:');
console.log('  1. Ensure your Amplify rewrites are correctly configured');
console.log('  2. Access the /diagnostics page to check client-side configuration');
console.log('  3. Check AWS Amplify Console for proper domain configuration');
console.log('  4. Verify CloudWatch logs for any backend authentication errors');

console.log('\n✅ Diagnostic complete!');
