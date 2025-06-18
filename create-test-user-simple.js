#!/usr/bin/env node

const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } = require("@aws-sdk/client-cognito-identity-provider");

// Simple test user creation
async function createTestUser() {
  console.log('Creating test user...');
  
  const client = new CognitoIdentityProviderClient({
    region: 'us-east-1'
  });

  const userPoolId = 'us-east-1_yHXcFoCsS';
  const testEmail = 'testuser@example.com';
  const testPassword = 'TestUser123!';

  try {
    // Create user
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: testEmail,
      UserAttributes: [
        { Name: "email", Value: testEmail },
        { Name: "email_verified", Value: "true" },
        { Name: "name", Value: "Test User" }
      ],
      MessageAction: "SUPPRESS",
    });

    await client.send(createCommand);
    console.log("✅ User created");

    // Set password
    const passwordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: testEmail,
      Password: testPassword,
      Permanent: true,
    });
    
    await client.send(passwordCommand);
    console.log("✅ Password set");

    console.log('\n🎉 TEST USER READY!');
    console.log('═'.repeat(40));
    console.log(`Email:    ${testEmail}`);
    console.log(`Password: ${testPassword}`);
    console.log('═'.repeat(40));
    console.log('\n🌐 Login at: http://localhost:3001/admin/login');

  } catch (error) {
    if (error.name === 'UsernameExistsException') {
      console.log('✅ User already exists, that\'s fine!');
      console.log('\n🎉 TEST USER READY!');
      console.log('═'.repeat(40));
      console.log(`Email:    ${testEmail}`);
      console.log(`Password: ${testPassword}`);
      console.log('═'.repeat(40));
      console.log('\n🌐 Login at: http://localhost:3001/admin/login');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

createTestUser();
