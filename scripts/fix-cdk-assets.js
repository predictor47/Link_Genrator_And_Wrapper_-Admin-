#!/usr/bin/env node

/**
 * CDK Asset Publishing Error Fixer
 * 
 * This script attempts to fix CDK asset publishing errors by:
 * 1. Identifying VTL templates in the cdk.out directory
 * 2. Manually publishing them to the S3 bucket
 * 3. Using CloudFormation directly if needed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Log file path
const logFile = path.join(logsDir, `asset-fixer-${new Date().toISOString().replace(/:/g, '-')}.log`);

// Function to log messages
function log(message, color = null) {
  const timestamp = new Date().toISOString();
  const formattedMessage = color ? `${color}${message}${colors.reset}` : message;
  console.log(formattedMessage);
  fs.appendFileSync(logFile, `${timestamp} ${message}\n`);
}

// Execute command and return result
async function executeCommand(command, description) {
  log(`Running: ${description}`, colors.blue);
  log(`Command: ${command}`, colors.yellow);
  
  try {
    const { stdout, stderr } = await exec(command);
    fs.appendFileSync(logFile, `Command: ${command}\nOutput: ${stdout}\nErrors: ${stderr}\n\n`);
    return { success: true, stdout, stderr };
  } catch (error) {
    fs.appendFileSync(logFile, `Command: ${command}\nError: ${error.message}\n\n`);
    return { success: false, error: error.message, stdout: error.stdout, stderr: error.stderr };
  }
}

// Get AWS account ID
async function getAwsAccountId() {
  const result = await executeCommand(
    'aws sts get-caller-identity --query "Account" --output text',
    'Getting AWS account ID'
  );
  
  if (result.success) {
    return result.stdout.trim();
  } else {
    log('Failed to get AWS account ID. Make sure AWS CLI is configured.', colors.red);
    process.exit(1);
  }
}

// Get AWS region
async function getAwsRegion() {
  const envRegion = process.env.AWS_REGION;
  if (envRegion) return envRegion;
  
  const result = await executeCommand(
    'aws configure get region',
    'Getting AWS region'
  );
  
  if (result.success) {
    return result.stdout.trim() || 'us-east-1';
  } else {
    log('Failed to get AWS region. Defaulting to us-east-1.', colors.yellow);
    return 'us-east-1';
  }
}

// Get CDK bootstrap bucket
async function getCdkBucket(region) {
  const result = await executeCommand(
    `aws cloudformation describe-stacks --stack-name CDKToolkit --region ${region} --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text`,
    'Getting CDK bootstrap bucket'
  );
  
  if (result.success && result.stdout.trim()) {
    return result.stdout.trim();
  } else {
    log('CDK bootstrap bucket not found. You need to bootstrap first.', colors.red);
    return null;
  }
}

// Find VTL templates in cdk.out
function findVtlTemplates() {
  const cdkOutDir = path.join(process.cwd(), 'cdk.out');
  
  if (!fs.existsSync(cdkOutDir)) {
    log('cdk.out directory not found. Run "npx cdk synth" first.', colors.red);
    return [];
  }
  
  const vtlFiles = fs.readdirSync(cdkOutDir)
    .filter(file => file.endsWith('.vtl'))
    .map(file => path.join(cdkOutDir, file));
  
  log(`Found ${vtlFiles.length} VTL template files.`, colors.green);
  return vtlFiles;
}

// Manually publish VTL files to S3
async function publishVtlToS3(vtlFiles, bucket, region) {
  log('Publishing VTL templates to S3...', colors.cyan);
  
  const results = [];
  for (const vtlFile of vtlFiles) {
    const fileName = path.basename(vtlFile);
    
    // The key in S3 should match what CDK expects (the asset hash)
    const s3Key = fileName;
    
    const result = await executeCommand(
      `aws s3 cp "${vtlFile}" s3://${bucket}/${s3Key} --region ${region}`,
      `Publishing ${fileName} to S3`
    );
    
    results.push({
      file: fileName,
      success: result.success,
      error: result.success ? null : result.error
    });
  }
  
  // Report results
  const successCount = results.filter(r => r.success).length;
  log(`Published ${successCount}/${vtlFiles.length} templates successfully.`, successCount === vtlFiles.length ? colors.green : colors.yellow);
  
  return results;
}

// Find all CloudFormation templates
function findCloudFormationTemplates() {
  const cdkOutDir = path.join(process.cwd(), 'cdk.out');
  
  if (!fs.existsSync(cdkOutDir)) {
    log('cdk.out directory not found. Run "npx cdk synth" first.', colors.red);
    return [];
  }
  
  const cfnFiles = fs.readdirSync(cdkOutDir)
    .filter(file => file.endsWith('.template.json'))
    .map(file => path.join(cdkOutDir, file));
  
  log(`Found ${cfnFiles.length} CloudFormation template files.`, colors.green);
  return cfnFiles;
}

// Helper function to verify stack existence
async function stackExists(stackName, region) {
  const result = await executeCommand(
    `aws cloudformation describe-stacks --stack-name ${stackName} --region ${region}`,
    `Checking if stack ${stackName} exists`
  );
  
  return result.success;
}

// Find parent stack template
function getParentStackTemplate() {
  const cdkOutDir = path.join(process.cwd(), 'cdk.out');
  const templates = fs.readdirSync(cdkOutDir)
    .filter(file => file.endsWith('.template.json') && !file.includes('.nested.'));
  
  if (templates.length === 0) {
    log('No parent stack template found.', colors.red);
    return null;
  }
  
  return path.join(cdkOutDir, templates[0]);
}

// Deploy the parent stack using AWS CloudFormation
async function deployParentStackWithCloudFormation(templatePath, stackName, region) {
  log(`Deploying parent stack ${stackName} with CloudFormation...`, colors.cyan);
  
  // First check if stack exists to determine create or update
  const exists = await stackExists(stackName, region);
  const command = exists
    ? `aws cloudformation update-stack --stack-name ${stackName} --template-body file://${templatePath} --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND --region ${region}`
    : `aws cloudformation create-stack --stack-name ${stackName} --template-body file://${templatePath} --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND --region ${region}`;
  
  const result = await executeCommand(
    command,
    `${exists ? 'Updating' : 'Creating'} CloudFormation stack ${stackName}`
  );
  
  if (result.success) {
    log(`Stack ${exists ? 'update' : 'creation'} initiated successfully.`, colors.green);
    
    // Wait for the stack to complete
    log('Waiting for stack deployment to complete (this may take several minutes)...', colors.blue);
    
    const waitCommand = `aws cloudformation wait stack-${exists ? 'update' : 'create'}-complete --stack-name ${stackName} --region ${region}`;
    const waitResult = await executeCommand(waitCommand, 'Waiting for stack deployment');
    
    if (waitResult.success) {
      log(`Stack ${stackName} deployed successfully!`, colors.green);
      return true;
    } else {
      log(`Stack deployment failed or timed out. Check the CloudFormation console.`, colors.red);
      return false;
    }
  } else {
    // If no updates, it's actually a success
    if (result.stderr && result.stderr.includes('No updates are to be performed')) {
      log('No updates are needed for the stack.', colors.green);
      return true;
    }
    
    log(`Stack deployment failed: ${result.error}`, colors.red);
    return false;
  }
}

// Main function
async function fixCdkAssetPublishingErrors() {
  log(`${colors.bold}${colors.cyan}CDK Asset Publishing Error Fixer${colors.reset}`, null);
  log(`${colors.cyan}==================================${colors.reset}\n`, null);
  
  // Step 1: Check AWS credentials
  log('Checking AWS credentials...', colors.blue);
  const checkCredentials = await executeCommand('aws sts get-caller-identity', 'Checking AWS credentials');
  
  if (!checkCredentials.success) {
    log('AWS credentials are not properly configured. Run "aws configure" first.', colors.red);
    return false;
  }
  
  // Step 2: Get AWS account and region
  const accountId = await getAwsAccountId();
  const region = await getAwsRegion();
  log(`AWS Account ID: ${accountId}`, colors.green);
  log(`AWS Region: ${region}`, colors.green);
  
  // Step 3: Get CDK bootstrap bucket
  const cdkBucket = await getCdkBucket(region);
  if (!cdkBucket) {
    log('Running CDK bootstrap...', colors.blue);
    const bootstrapResult = await executeCommand(`npx cdk bootstrap aws://${accountId}/${region}`, 'Bootstrapping CDK');
    
    if (!bootstrapResult.success) {
      log('Failed to bootstrap CDK environment. Fix this issue first.', colors.red);
      return false;
    }
    
    // Try to get the bucket again
    const retryBucket = await getCdkBucket(region);
    if (!retryBucket) {
      log('Still could not find the CDK bootstrap bucket. Check your AWS permissions.', colors.red);
      return false;
    }
  }
  
  log(`CDK Bootstrap Bucket: ${cdkBucket}`, colors.green);
  
  // Step 4: Find and publish VTL templates
  const vtlFiles = findVtlTemplates();
  if (vtlFiles.length > 0) {
    const publishResults = await publishVtlToS3(vtlFiles, cdkBucket, region);
    
    // Check if any publishing failed
    const failures = publishResults.filter(r => !r.success);
    if (failures.length > 0) {
      log('Some VTL templates failed to publish to S3:', colors.red);
      failures.forEach(f => log(`- ${f.file}: ${f.error}`, colors.red));
    }
  }
  
  // Step 5: Try deploying with CDK hotswap first
  log('Trying deployment with CDK hotswap...', colors.cyan);
  const hotswapResult = await executeCommand(
    'npx cdk deploy --hotswap',
    'Deploying with CDK hotswap'
  );
  
  if (hotswapResult.success) {
    log('CDK hotswap deployment succeeded!', colors.green);
    return true;
  }
  
  // Step 6: If hotswap fails, try direct CloudFormation deployment
  log('CDK hotswap failed, trying direct CloudFormation deployment...', colors.yellow);
  
  // Get Amplify stack name from cdk.json
  let stackName = 'amplify-linkgeneratorandwrapperadmin-dev';
  try {
    const cdkJson = JSON.parse(fs.readFileSync('cdk.json', 'utf8'));
    const namespace = cdkJson.context['amplify-backend-namespace'] || 'link-generator-and-wrapper-admin';
    const name = cdkJson.context['amplify-backend-name'] || 'dev';
    const type = cdkJson.context['amplify-backend-type'] || 'sandbox';
    
    stackName = `amplify-${namespace.replace(/\s+/g, '')}-${name}-${type}`;
  } catch (err) {
    log(`Error reading stack name from cdk.json, using default: ${stackName}`, colors.yellow);
  }
  
  // Deploy the parent stack with CloudFormation
  const parentStackTemplate = getParentStackTemplate();
  if (!parentStackTemplate) {
    log('Could not find parent stack template. Run "npx cdk synth" first.', colors.red);
    return false;
  }
  
  const cfDeployResult = await deployParentStackWithCloudFormation(
    parentStackTemplate,
    stackName,
    region
  );
  
  if (cfDeployResult) {
    log('✅ Deployment via CloudFormation succeeded!', colors.green);
    log('Your Amplify backend should now be accessible.', colors.green);
    return true;
  } else {
    log('❌ Deployment via CloudFormation failed.', colors.red);
    log('Check the AWS CloudFormation console for detailed error messages.', colors.yellow);
    return false;
  }
}

// Run the fixer
fixCdkAssetPublishingErrors().then(success => {
  if (success) {
    log('\n✅ CDK asset publishing errors have been fixed successfully!', colors.green);
  } else {
    log('\n❌ Could not fully resolve CDK asset publishing errors.', colors.red);
    log('Please check the log file for more details:', colors.yellow);
    log(logFile, colors.yellow);
  }
}).catch(err => {
  log(`Error: ${err.message}`, colors.red);
  process.exit(1);
});
