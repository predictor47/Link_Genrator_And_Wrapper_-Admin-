#!/usr/bin/env node

/**
 * AWS Amplify Gen 2 Environment Validator
 * 
 * This script validates the AWS environment configuration and CDK bootstrap status
 * to help troubleshoot deployment issues.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// ANSI color codes for output formatting
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
const logFile = path.join(logsDir, `aws-validation-${new Date().toISOString().replace(/:/g, '-')}.log`);

// Function to log to console and file
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  let formattedMessage = message;
  
  // Add color to console output
  switch(type) {
    case 'success':
      console.log(`${colors.green}✓ ${message}${colors.reset}`);
      break;
    case 'error':
      console.error(`${colors.red}✗ ${message}${colors.reset}`);
      break;
    case 'warning':
      console.warn(`${colors.yellow}⚠ ${message}${colors.reset}`);
      break;
    case 'info':
      console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
      break;
    case 'title':
      console.log(`\n${colors.cyan}${colors.bold}${message}${colors.reset}\n`);
      break;
    default:
      console.log(message);
  }
  
  // Write to log file without color codes
  fs.appendFileSync(logFile, `${timestamp} [${type.toUpperCase()}] ${message}\n`);
}

// Function to run a command and return the result
async function runCommand(command, description) {
  log(`Running: ${description} (${command})`, 'info');
  try {
    const { stdout, stderr } = await exec(command);
    fs.appendFileSync(logFile, `COMMAND: ${command}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}\n\n`);
    return { success: true, output: stdout, error: stderr };
  } catch (error) {
    fs.appendFileSync(logFile, `COMMAND: ${command}\nERROR:\n${error.message}\n\n`);
    return { success: false, output: error.stdout, error: error.message };
  }
}

// Main validation function
async function validateAwsEnvironment() {
  log('Starting AWS Environment Validation for Amplify Gen 2', 'title');
  log(`Log file: ${logFile}`, 'info');
  
  // Step 1: Check AWS credentials
  log('Checking AWS credentials...', 'title');
  const credentialsResult = await runCommand('aws sts get-caller-identity', 'Validate AWS credentials');
  
  if (credentialsResult.success) {
    const identityData = JSON.parse(credentialsResult.output);
    log(`Authenticated as ${identityData.Arn}`, 'success');
    
    // Check if the user is authorized for CDK operations
    if (identityData.Arn.includes('assumed-role')) {
      log('Using an assumed role, which is appropriate for CI/CD environments', 'info');
    } else if (identityData.Arn.includes(':user/')) {
      log('Using an IAM user, ensure it has sufficient permissions for CDK deployments', 'info');
    }
  } else {
    log('Failed to authenticate with AWS. Check your credentials.', 'error');
    log('Make sure you have set up AWS credentials properly:', 'info');
    log('- Run "aws configure" to set up credentials locally', 'info');
    log('- Or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables', 'info');
    return false;
  }
  
  // Step 2: Check AWS region
  log('Checking AWS region configuration...', 'title');
  const regionResult = await runCommand('aws configure get region', 'Get configured AWS region');
  
  if (regionResult.success && regionResult.output.trim()) {
    const region = regionResult.output.trim();
    log(`Using AWS region: ${region}`, 'success');
    
    // Check if this region is explicitly set in the CDK configuration
    try {
      const cdkJson = JSON.parse(fs.readFileSync('cdk.json', 'utf8'));
      if (!cdkJson.context['aws-cdk:enableRegionalInference'] && !cdkJson.context.region) {
        log('AWS region is not explicitly set in cdk.json, CDK will use the default region', 'warning');
      }
    } catch (err) {
      log('Could not read cdk.json to verify region settings', 'warning');
    }
  } else {
    log('AWS region is not configured. Set a region using "aws configure" or AWS_REGION environment variable', 'error');
    return false;
  }
  
  // Step 3: Check CDK bootstrap status
  log('Checking CDK bootstrap status...', 'title');
  const region = regionResult.output.trim() || process.env.AWS_REGION || 'us-east-1';
  const account = JSON.parse(credentialsResult.output).Account;
  
  // Check for CDK bootstrap stack
  const cdkBootstrapResult = await runCommand(`aws cloudformation describe-stacks --stack-name CDKToolkit --region ${region}`, 'Check CDK bootstrap status');
  
  if (cdkBootstrapResult.success) {
    log('CDK environment is bootstrapped! ✓', 'success');
  } else {
    log('CDK environment is not bootstrapped. This is required for CDK deployments.', 'error');
    log('Run the following command to bootstrap:', 'info');
    log(`npx cdk bootstrap aws://${account}/${region}`, 'info');
    
    // Try to bootstrap automatically
    log('Attempting to bootstrap automatically...', 'info');
    const bootstrapResult = await runCommand(`npx cdk bootstrap aws://${account}/${region}`, 'Bootstrap CDK environment');
    
    if (bootstrapResult.success) {
      log('Successfully bootstrapped CDK environment! ✓', 'success');
    } else {
      log('Failed to bootstrap CDK environment. You may need to run the command manually with admin privileges.', 'error');
      return false;
    }
  }
  
  // Step 4: Check S3 bucket permissions
  log('Checking S3 bucket permissions...', 'title');
  
  // Get the bootstrap bucket name
  const bootstrapBucketResult = await runCommand(
    `aws cloudformation describe-stacks --stack-name CDKToolkit --region ${region} --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text`,
    'Get CDK bootstrap bucket name'
  );
  
  if (bootstrapBucketResult.success && bootstrapBucketResult.output.trim()) {
    const bucketName = bootstrapBucketResult.output.trim();
    log(`CDK bootstrap bucket: ${bucketName}`, 'success');
    
    // Check if we can list objects in the bucket
    const listBucketResult = await runCommand(`aws s3 ls s3://${bucketName} --max-items 5`, 'Test S3 bucket access');
    
    if (listBucketResult.success) {
      log('S3 bucket permissions look good! You have read access to the bucket.', 'success');
      
      // Try to put a test object to verify write permissions
      const testFileName = 'test-permission.txt';
      fs.writeFileSync(testFileName, 'Test file for S3 permissions check');
      
      const putObjectResult = await runCommand(
        `aws s3 cp ${testFileName} s3://${bucketName}/test-permission-${Date.now()}.txt`,
        'Test S3 write permissions'
      );
      
      if (putObjectResult.success) {
        log('S3 write permissions confirmed! You can publish assets to this bucket.', 'success');
        fs.unlinkSync(testFileName);
      } else {
        log('S3 write permission test failed. You may not have permission to publish assets.', 'error');
        log('This could cause CDK asset publishing errors during deployment.', 'warning');
        fs.unlinkSync(testFileName);
      }
    } else {
      log('Failed to list objects in the S3 bucket. You may not have proper permissions.', 'error');
      return false;
    }
  } else {
    log('Could not determine the CDK bootstrap bucket name. Skipping S3 permission check.', 'warning');
  }
  
  // Step 5: Check for common VTL issues in cdk.out
  log('Checking for VTL template issues...', 'title');
  const cdkOutDir = path.join(process.cwd(), 'cdk.out');
  
  if (fs.existsSync(cdkOutDir)) {
    const vtlFiles = fs.readdirSync(cdkOutDir).filter(file => file.endsWith('.vtl'));
    log(`Found ${vtlFiles.length} VTL template files in cdk.out directory.`, 'info');
    
    let vtlIssuesFound = false;
    const commonVtlErrors = [
      { pattern: /\$util\.toJson\([^)]*$/m, message: 'Missing closing parenthesis in $util.toJson()' },
      { pattern: /#set\([^)]*$/m, message: 'Missing closing parenthesis in #set()' },
      { pattern: /\\"(?:[^"\\]|\\.)*"/m, message: 'Possible improper escaping in strings' }
    ];
    
    for (const vtlFile of vtlFiles) {
      const vtlPath = path.join(cdkOutDir, vtlFile);
      const content = fs.readFileSync(vtlPath, 'utf8');
      
      for (const errorPattern of commonVtlErrors) {
        if (errorPattern.pattern.test(content)) {
          log(`Issue in ${vtlFile}: ${errorPattern.message}`, 'error');
          vtlIssuesFound = true;
        }
      }
    }
    
    if (!vtlIssuesFound) {
      log('No common VTL syntax issues detected! ✓', 'success');
    } else {
      log('Found VTL syntax issues that could cause asset publishing errors.', 'error');
      log('Consider regenerating the templates by modifying your GraphQL schema.', 'info');
    }
  } else {
    log('No cdk.out directory found. Run "npx cdk synth" first to generate templates.', 'warning');
  }
  
  // Final summary
  log('AWS Environment Validation Summary', 'title');
  log('✓ AWS credentials valid', credentialsResult.success ? 'success' : 'error');
  log('✓ AWS region configured', regionResult.success ? 'success' : 'error');
  log('✓ CDK environment bootstrapped', cdkBootstrapResult.success ? 'success' : 'error');
  
  if (credentialsResult.success && regionResult.success && cdkBootstrapResult.success) {
    log('Your AWS environment appears to be properly configured for Amplify Gen 2 deployment!', 'success');
    log('If you still encounter deployment issues, check the detailed log file for more information:', 'info');
    log(logFile, 'info');
    return true;
  } else {
    log('There are issues with your AWS environment that need to be resolved before deployment.', 'error');
    log('Please check the detailed log file and address the issues above:', 'info');
    log(logFile, 'info');
    return false;
  }
}

// Run the validation
validateAwsEnvironment().then(success => {
  if (!success) {
    process.exit(1);
  }
}).catch(err => {
  log(`Unexpected error: ${err.message}`, 'error');
  process.exit(1);
});
