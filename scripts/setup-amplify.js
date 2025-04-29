/**
 * Setup script for AWS Amplify deployment
 * This script helps configure the necessary settings for deploying to Amplify
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Project paths
const projectRoot = process.cwd();
const amplifyYmlPath = path.join(projectRoot, 'amplify.yml');
const packageJsonPath = path.join(projectRoot, 'package.json');

// Check if Amplify CLI is installed
try {
  const amplifyVersion = execSync('amplify --version').toString().trim();
  console.log(`Amplify CLI detected: ${amplifyVersion}`);
} catch (error) {
  console.error('Amplify CLI is not installed. Please install it first:');
  console.error('npm install -g @aws-amplify/cli');
  process.exit(1);
}

// Create Amplify YML config if it doesn't exist
if (!fs.existsSync(amplifyYmlPath)) {
  console.log('Creating amplify.yml configuration file...');
  
  const amplifyYml = `version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
`;

  fs.writeFileSync(amplifyYmlPath, amplifyYml, 'utf8');
  console.log('amplify.yml created successfully.');
} else {
  console.log('amplify.yml already exists, skipping creation.');
}

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Make sure we have the necessary build scripts
if (!packageJson.scripts?.build) {
  console.log('Adding build script to package.json...');
  packageJson.scripts = {
    ...packageJson.scripts,
    build: 'next build',
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
  console.log('Added build script to package.json.');
}

console.log('\nAmplify setup completed successfully!');
console.log('\nNext steps:');
console.log('1. Make sure your AWS credentials are configured:');
console.log('   - Run "aws configure" if you haven\'t already');
console.log('2. Deploy your backend:');
console.log('   - Run "amplify push"');
console.log('3. Create the admin user:');
console.log('   - Run "node scripts/create-admin-user.js"');
console.log('4. Connect the Amplify hosting:');
console.log('   - Run "amplify add hosting" or use the Amplify console');
console.log('5. Deploy everything:');
console.log('   - Run "amplify publish"');
console.log('\nYou can then access your admin area using:');
console.log('- Email: protegeresearch@gmail.com');
console.log('- Password: Logitude!10');