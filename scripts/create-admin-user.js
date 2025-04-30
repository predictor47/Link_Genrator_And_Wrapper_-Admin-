/**
 * Script to create an admin user in AWS Cognito
 * Run this after deploying your Amplify backend to create the initial admin user
 */
const { 
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminGetUserCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const { fromIni } = require("@aws-sdk/credential-provider-ini");
const fs = require('fs');
const path = require('path');

// Read Amplify outputs - try multiple possible locations
let amplifyOutputs;
const possiblePaths = [
  path.join(process.cwd(), 'amplify_outputs.json'),
  path.join(process.cwd(), '.amplify', 'amplify_outputs.json'),
  path.join(process.cwd(), 'src', 'amplify_outputs.json')
];

for (const possiblePath of possiblePaths) {
  if (fs.existsSync(possiblePath)) {
    console.log(`Found amplify_outputs.json at: ${possiblePath}`);
    amplifyOutputs = JSON.parse(fs.readFileSync(possiblePath, 'utf8'));
    break;
  }
}

if (!amplifyOutputs) {
  console.error('Error: amplify_outputs.json not found in any expected location.');
  console.error('Please specify the path to your amplify_outputs.json file:');
  console.error('node scripts/create-admin-user.js --outputs-path=/path/to/amplify_outputs.json');
  process.exit(1);
}

// Get UserPool ID from Amplify outputs
const userPoolId = amplifyOutputs.auth?.userPoolId;

if (!userPoolId) {
  console.error('Error: UserPool ID not found in amplify_outputs.json');
  process.exit(1);
}

// Create the admin user
async function createAdminUser() {
  const region = amplifyOutputs.auth?.region || 'us-east-1';
  
  // Admin user details
  const adminEmail = 'protegeresearch@gmail.com';
  const adminPassword = 'Logitude!10';
  const adminUsername = adminEmail; // Using email as username

  try {
    // Create Cognito client with AWS SDK v3
    const cognitoClient = new CognitoIdentityProviderClient({
      region,
      credentials: fromIni()
    });

    console.log(`Creating admin user: ${adminEmail} in UserPool: ${userPoolId}`);

    // Check if user already exists
    try {
      const adminGetUserCommand = new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: adminUsername
      });
      
      await cognitoClient.send(adminGetUserCommand);
      console.log('Admin user already exists, skipping creation.');
    } catch (error) {
      // User doesn't exist, proceed with creation
      if (error.name === 'UserNotFoundException') {
        // Create the user
        const createUserCommand = new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: adminUsername,
          UserAttributes: [
            { Name: 'email', Value: adminEmail },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'custom:role', Value: 'admin' }
          ],
          MessageAction: 'SUPPRESS' // Don't send welcome email
        });
        
        const createResult = await cognitoClient.send(createUserCommand);
        console.log('Admin user created successfully.');

        // Set the permanent password
        const setPasswordCommand = new AdminSetUserPasswordCommand({
          UserPoolId: userPoolId,
          Username: adminUsername,
          Password: adminPassword,
          Permanent: true
        });
        
        await cognitoClient.send(setPasswordCommand);
        console.log('Admin password set successfully.');
        
        // Add user to admin group if it exists
        try {
          const addToGroupCommand = new AdminAddUserToGroupCommand({
            UserPoolId: userPoolId,
            Username: adminUsername,
            GroupName: 'Admins'
          });
          
          await cognitoClient.send(addToGroupCommand);
          console.log('Admin user added to Admins group.');
        } catch (groupError) {
          console.log('Note: Admins group might not exist. User created without group assignment.');
        }
      } else {
        throw error;
      }
    }

    console.log('Admin user setup completed successfully!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('You can now log in to the admin panel using these credentials.');

  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();