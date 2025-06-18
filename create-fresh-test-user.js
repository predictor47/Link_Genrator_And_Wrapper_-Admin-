#!/usr/bin/env node

const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminDeleteUserCommand } = require("@aws-sdk/client-cognito-identity-provider");

async function createFreshTestUser() {
  console.log('🔧 Creating Fresh Test User...\n');
  
  const client = new CognitoIdentityProviderClient({
    region: 'us-east-1'
  });

  const userPoolId = 'us-east-1_yHXcFoCsS';
  const testEmail = 'testuseradmin@protege.com';
  const testPassword = 'Admin123!';

  try {
    // Delete user if exists
    try {
      await client.send(new AdminDeleteUserCommand({
        UserPoolId: userPoolId,
        Username: testEmail,
      }));
      console.log('🗑️ Deleted existing user');
    } catch (e) {
      console.log('ℹ️ No existing user to delete');
    }

    // Create new user
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: testEmail,
      UserAttributes: [
        { Name: "email", Value: testEmail },
        { Name: "email_verified", Value: "true" },
        { Name: "name", Value: "Test Admin User" }
      ],
      MessageAction: "SUPPRESS",
    });

    await client.send(createCommand);
    console.log("✅ User created successfully");

    // Set password
    const passwordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: testEmail,
      Password: testPassword,
      Permanent: true,
    });
    
    await client.send(passwordCommand);
    console.log("✅ Password set successfully");

    console.log('\n🎉 FRESH TEST USER CREATED!');
    console.log('═'.repeat(50));
    console.log('📋 LOGIN CREDENTIALS:');
    console.log('═'.repeat(50));
    console.log(`Email:    ${testEmail}`);
    console.log(`Password: ${testPassword}`);
    console.log('═'.repeat(50));
    console.log('\n🌐 TESTING STEPS:');
    console.log('1. Open: http://localhost:3001/admin/login');
    console.log('2. Login with credentials above');
    console.log('3. Test all features:');
    console.log('   • Create project');
    console.log('   • Add vendors');
    console.log('   • Generate links with respid/vendor options');
    console.log('   • Check analytics dashboard');
    console.log('\n✨ Ready for comprehensive testing! ✨');

  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    console.log('\n💡 Try using the existing credentials:');
    console.log('Email: testuser@example.com');
    console.log('Password: TestUser123!');
  }
}

createFreshTestUser();
