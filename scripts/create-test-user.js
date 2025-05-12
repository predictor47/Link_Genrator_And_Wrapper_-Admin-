/**
 * Script to create a test admin user
 */
const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
const fs = require('fs');
const path = require('path');

// Read configuration from amplify_outputs.json
function getConfig() {
  const amplifyOutputsPath = path.join(process.cwd(), 'amplify_outputs.json');
  
  if (!fs.existsSync(amplifyOutputsPath)) {
    console.error('amplify_outputs.json file not found');
    return null;
  }
  
  try {
    const outputs = JSON.parse(fs.readFileSync(amplifyOutputsPath, 'utf8'));
    
    // Get user pool ID
    const userPoolId = outputs.auth?.user_pool_id || 
                       process.env.USER_POOL_ID || 
                       'us-east-1_QIwwMdokt';
    
    // Get region
    const region = outputs.auth?.aws_region || 'us-east-1';
    
    return { userPoolId, region };
  } catch (err) {
    console.error('Error reading amplify_outputs.json:', err);
    return null;
  }
}

async function createUser() {
  const config = getConfig();
  
  if (!config) {
    console.error('Failed to get configuration');
    return;
  }
  
  const { userPoolId, region } = config;
  
  // Get user details from command line args or use defaults
  const email = process.env.USER_EMAIL || 'admin@example.com';
  const tempPassword = process.env.TEMP_PASSWORD || 'Temp1234!';
  const name = process.env.USER_NAME || 'Admin User';
  
  console.log('Creating admin user...');
  console.log(`User Pool ID: ${userPoolId}`);
  console.log(`Region: ${region}`);
  console.log(`Email: ${email}`);
  
  // Create Cognito client
  const client = new CognitoIdentityProviderClient({ region });
  
  try {
    // Create the user
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      TemporaryPassword: tempPassword,
      MessageAction: 'SUPPRESS', // Don't send email
      UserAttributes: [
        {
          Name: 'email',
          Value: email
        },
        {
          Name: 'email_verified',
          Value: 'true'
        },
        {
          Name: 'name',
          Value: name
        },
        {
          Name: 'custom:role',
          Value: 'admin'
        }
      ]
    });
    
    const createResult = await client.send(createUserCommand);
    console.log('User created:', createResult.User.Username);
    
    // Set permanent password
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: email,
      Password: tempPassword,
      Permanent: true
    });
    
    await client.send(setPasswordCommand);
    console.log('Password set permanently');
    
    console.log('\nUser details:');
    console.log('-------------');
    console.log(`Email: ${email}`);
    console.log(`Password: ${tempPassword}`);
    console.log('\nYou can now log in with these credentials.');
    
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error.name === 'UsernameExistsException') {
      console.log('\nUser already exists. You can try logging in with the provided credentials.');
    }
  }
}

createUser();
