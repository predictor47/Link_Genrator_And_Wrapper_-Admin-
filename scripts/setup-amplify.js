/**
 * Setup script for AWS Amplify Gen 2 deployment
 * This script helps configure the necessary settings for deploying to Amplify
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Project paths
const projectRoot = process.cwd();
const amplifyYmlPath = path.join(projectRoot, 'amplify.yml');
const packageJsonPath = path.join(projectRoot, 'package.json');

// Check if AWS CLI is installed
try {
  const awsVersion = execSync('aws --version').toString().trim();
  console.log(`AWS CLI detected: ${awsVersion}`);
} catch (error) {
  console.error('AWS CLI is not installed. Please install it first:');
  console.error('pip install awscli or follow https://aws.amazon.com/cli/');
  process.exit(1);
}

// Check if Amplify Gen 2 CLI is installed
try {
  const ampxVersion = execSync('npx ampx --version').toString().trim();
  console.log(`Amplify Gen 2 CLI detected: ${ampxVersion}`);
} catch (error) {
  console.log('Installing Amplify Gen 2 CLI...');
  try {
    execSync('npm install @aws-amplify/backend-cli', { stdio: 'inherit' });
  } catch (installError) {
    console.error('Failed to install Amplify Gen 2 CLI:', installError);
    process.exit(1);
  }
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
  customHeaders:
    - pattern: '**/*'
      headers:
        - key: 'Strict-Transport-Security'
          value: 'max-age=31536000; includeSubDomains'
        - key: 'X-Frame-Options'
          value: 'SAMEORIGIN'
        - key: 'X-XSS-Protection'
          value: '1; mode=block'
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

// Create the admin user script if it doesn't exist
const adminScriptPath = path.join(projectRoot, 'scripts', 'create-admin-aws-cli.js');
if (!fs.existsSync(adminScriptPath)) {
  console.log('Creating admin user creation script...');
  
  const adminScript = `/**
 * Script to create an admin user in AWS Cognito using AWS CLI
 * This script uses AWS CLI commands to create an admin user
 */
const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Admin user details
const adminEmail = 'protegeresearch@gmail.com';
const adminPassword = 'Logitude!10';
const adminUsername = adminEmail;

async function promptForInput(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(\`Error executing command: \${error}\`);
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

async function createAdminUser() {
  try {
    console.log('Creating admin user in AWS Cognito');
    console.log('----------------------------------');
    
    // Prompt for UserPool ID and Region
    const userPoolId = await promptForInput('Enter the Cognito User Pool ID: ');
    const region = await promptForInput('Enter the AWS region (e.g., us-east-1): ');
    
    // Check if user exists
    console.log(\`Checking if user \${adminUsername} already exists...\`);
    
    try {
      await executeCommand(\`aws cognito-idp admin-get-user --user-pool-id \${userPoolId} --username \${adminUsername} --region \${region}\`);
      console.log('Admin user already exists, skipping creation.');
    } catch (error) {
      // User doesn't exist, create it
      console.log(\`Creating admin user: \${adminEmail}...\`);
      
      // Create the user
      await executeCommand(\`aws cognito-idp admin-create-user --user-pool-id \${userPoolId} --username \${adminUsername} --user-attributes Name=email,Value=\${adminEmail} Name=email_verified,Value=true Name="custom:role",Value=admin --message-action SUPPRESS --region \${region}\`);
      
      // Set the permanent password
      await executeCommand(\`aws cognito-idp admin-set-user-password --user-pool-id \${userPoolId} --username \${adminUsername} --password "\${adminPassword}" --permanent --region \${region}\`);
      
      console.log('Admin user created successfully!');
      
      // Try to add user to admin group
      try {
        console.log('Attempting to add user to Admins group...');
        await executeCommand(\`aws cognito-idp admin-add-user-to-group --user-pool-id \${userPoolId} --username \${adminUsername} --group-name Admins --region \${region}\`);
        console.log('Admin user added to Admins group.');
      } catch (groupError) {
        console.log('Note: Admins group might not exist. User created without group assignment.');
      }
    }
    
    console.log('\\nAdmin user setup completed successfully!');
    console.log(\`Email: \${adminEmail}\`);
    console.log(\`Password: \${adminPassword}\`);
    console.log('You can now log in to the admin panel using these credentials.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
  }
}

createAdminUser();`;

  // Create the scripts directory if it doesn't exist
  const scriptsDir = path.join(projectRoot, 'scripts');
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir);
  }
  
  fs.writeFileSync(adminScriptPath, adminScript, 'utf8');
  console.log('Admin user creation script created successfully.');
}

console.log('\nAmplify Gen 2 setup completed successfully!');
console.log('\nDeployment steps:');
console.log('1. Make sure your AWS credentials are configured:');
console.log('   - Run "aws configure" if you haven\'t already');
console.log('2. Generate backend configuration:');
console.log('   - Run "npx ampx sandbox --branch main --outputs-path ./amplify_outputs.json"');
console.log('   - Wait until it creates the outputs file, then press Ctrl+C');
console.log('3. Build the application:');
console.log('   - Run "npm run build"');
console.log('4. Deploy with AWS CLI:');
console.log('   - Run "aws amplify create-app --name SurveyLinkWrapper --platform WEB"');
console.log('   - Note the App ID from the output');
console.log('   - Run "aws amplify create-branch --app-id YOUR_APP_ID --branch-name main"');
console.log('   - Run "aws amplify start-job --app-id YOUR_APP_ID --branch-name main --job-type RELEASE"');
console.log('5. Create admin user:');
console.log('   - Run "node scripts/create-admin-aws-cli.js"');
console.log('   - Enter the User Pool ID from amplify_outputs.json');
console.log('\nAfter deployment:');
console.log('- Your app will be available at: https://main.YOUR_APP_ID.amplifyapp.com');
console.log('- Admin login credentials:');
console.log('  - Email: protegeresearch@gmail.com');
console.log('  - Password: Logitude!10');