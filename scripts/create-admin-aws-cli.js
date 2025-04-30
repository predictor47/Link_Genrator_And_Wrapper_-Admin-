/**
 * Script to create an admin user in AWS Cognito using AWS CLI
 * This script uses AWS CLI commands to create an admin user
 * when you don't have access to the amplify_outputs.json file
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
        console.error(`Error executing command: ${error}`);
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
    console.log(`Checking if user ${adminUsername} already exists...`);
    
    try {
      await executeCommand(`aws cognito-idp admin-get-user --user-pool-id ${userPoolId} --username ${adminUsername} --region ${region}`);
      console.log('Admin user already exists, skipping creation.');
    } catch (error) {
      // User doesn't exist, create it
      console.log(`Creating admin user: ${adminEmail}...`);
      
      // Create the user
      await executeCommand(`aws cognito-idp admin-create-user --user-pool-id ${userPoolId} --username ${adminUsername} --user-attributes Name=email,Value=${adminEmail} Name=email_verified,Value=true Name="custom:role",Value=admin --message-action SUPPRESS --region ${region}`);
      
      // Set the permanent password
      await executeCommand(`aws cognito-idp admin-set-user-password --user-pool-id ${userPoolId} --username ${adminUsername} --password "${adminPassword}" --permanent --region ${region}`);
      
      console.log('Admin user created successfully!');
      
      // Try to add user to admin group
      try {
        console.log('Attempting to add user to Admins group...');
        await executeCommand(`aws cognito-idp admin-add-user-to-group --user-pool-id ${userPoolId} --username ${adminUsername} --group-name Admins --region ${region}`);
        console.log('Admin user added to Admins group.');
      } catch (groupError) {
        console.log('Note: Admins group might not exist. User created without group assignment.');
      }
    }
    
    console.log('\nAdmin user setup completed successfully!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('You can now log in to the admin panel using these credentials.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
  }
}

createAdminUser();