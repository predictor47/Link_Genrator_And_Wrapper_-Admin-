#!/usr/bin/env node

/**
 * Create Test User for Sandbox Testing
 * This script creates a test user in the Amplify Cognito user pool for testing purposes
 */

const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminDeleteUserCommand } = require("@aws-sdk/client-cognito-identity-provider");
const fs = require('fs');
const path = require('path');

// Load Amplify configuration
const amplifyOutputsPath = path.join(process.cwd(), 'amplify_outputs.json');
if (!fs.existsSync(amplifyOutputsPath)) {
  console.error('❌ amplify_outputs.json not found. Make sure Amplify sandbox is running.');
  process.exit(1);
}

const amplifyOutputs = JSON.parse(fs.readFileSync(amplifyOutputsPath, 'utf8'));
const userPoolId = amplifyOutputs.auth?.user_pool_id;
const region = amplifyOutputs.auth?.aws_region || 'us-east-1';

if (!userPoolId) {
  console.error('❌ User Pool ID not found in amplify_outputs.json');
  process.exit(1);
}

// Test user configuration
const TEST_USER = {
  email: 'testuser@example.com',
  password: 'TestUser123!',
  name: 'Test User',
  username: 'testuser@example.com'
};

async function createTestUser() {
  console.log('🔧 Creating Test User for Sandbox Testing...\n');
  
  const client = new CognitoIdentityProviderClient({
    region: region,
  });

  try {
    // First, try to delete the user if it already exists
    console.log('🗑️  Checking if user already exists...');
    try {
      await client.send(new AdminDeleteUserCommand({
        UserPoolId: userPoolId,
        Username: TEST_USER.username,
      }));
      console.log('✅ Existing user deleted');
    } catch (deleteError) {
      // User doesn't exist, which is fine
      console.log('ℹ️  No existing user found (this is normal)');
    }

    // Create new user
    console.log('👤 Creating new test user...');
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: TEST_USER.username,
      UserAttributes: [
        { Name: "email", Value: TEST_USER.email },
        { Name: "email_verified", Value: "true" },
        { Name: "name", Value: TEST_USER.name }
      ],
      MessageAction: "SUPPRESS", // Don't send welcome email
    });

    await client.send(createCommand);
    console.log('✅ User created successfully');

    // Set permanent password
    console.log('🔐 Setting permanent password...');
    const passwordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: TEST_USER.username,
      Password: TEST_USER.password,
      Permanent: true,
    });
    
    await client.send(passwordCommand);
    console.log('✅ Password set successfully');

    // Success summary
    console.log('\n🎉 TEST USER CREATED SUCCESSFULLY!\n');
    console.log('═'.repeat(50));
    console.log('📋 LOGIN CREDENTIALS:');
    console.log('═'.repeat(50));
    console.log(`Email/Username: ${TEST_USER.email}`);
    console.log(`Password:       ${TEST_USER.password}`);
    console.log(`Name:           ${TEST_USER.name}`);
    console.log('═'.repeat(50));
    
    console.log('\n🌐 HOW TO TEST:');
    console.log('1. Open your browser to: http://localhost:3001/admin/login');
    console.log('2. Enter the email and password above');
    console.log('3. You should be logged into the admin dashboard');
    console.log('4. Test all features:');
    console.log('   • Create projects');
    console.log('   • Add vendors');
    console.log('   • Generate links with respid/vendor options');
    console.log('   • View analytics dashboard');
    console.log('   • Test all tracking features');
    
    console.log('\n📊 AMPLIFY INFO:');
    console.log(`User Pool ID: ${userPoolId}`);
    console.log(`Region: ${region}`);
    console.log(`Environment: Sandbox`);
    
    console.log('\n✨ Ready for testing! ✨');

  } catch (error) {
    console.error('\n💥 ERROR creating test user:');
    console.error('Error details:', error);
    
    if (error.name === 'UsernameExistsException') {
      console.log('\n💡 User already exists. Try running the script again to recreate.');
    } else if (error.name === 'InvalidPasswordException') {
      console.log('\n💡 Password doesn\'t meet requirements. Check Cognito password policy.');
    } else if (error.name === 'ResourceNotFoundException') {
      console.log('\n💡 User Pool not found. Make sure Amplify sandbox is running.');
    }
    
    process.exit(1);
  }
}

// Run the script
createTestUser().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});