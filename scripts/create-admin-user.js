// create-admin-user.js
const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } = require("@aws-sdk/client-cognito-identity-provider");

// Get user pool ID from your amplify_outputs.json or environment variables
const fs = require('fs');
const path = require('path');
const amplifyOutputsPath = path.join(process.cwd(), 'amplify_outputs.json');
const amplifyOutputs = JSON.parse(fs.readFileSync(amplifyOutputsPath, 'utf8'));
const userPoolId = amplifyOutputs.auth.user_pool_id;

async function createAdminUser() {
  const client = new CognitoIdentityProviderClient({
    region: amplifyOutputs.auth.aws_region || 'us-east-1',
  });

  // Create user
  const createCommand = new AdminCreateUserCommand({
    UserPoolId: userPoolId,
    Username: "exampleadmin@example.com",
    UserAttributes: [
      { Name: "email", Value: "exampleadmin@example.com" },
      { Name: "email_verified", Value: "true" },
      { Name: "name", Value: "Example Admin" }
    ],
    MessageAction: "SUPPRESS",
  });

  try {
    await client.send(createCommand);
    console.log("User created");

    // Set permanent password
    const passwordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: "exampleadmin@example.com",
      Password: "TemporaryPassword123!",
      Permanent: true,
    });
    await client.send(passwordCommand);
    console.log("Password set");

    console.log("Admin user created successfully");
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

createAdminUser();