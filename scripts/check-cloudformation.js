#!/usr/bin/env node

/**
 * CloudFormation Stack Status Checker
 * 
 * This script checks the status of CloudFormation stacks related to your Amplify Gen 2 deployment
 * and provides detailed insights into any failures or issues.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Log file path
const logFile = path.join(logsDir, `cloudformation-check-${new Date().toISOString().replace(/:/g, '-')}.log`);

// Function to log messages
function log(message, color = null) {
  const formattedMessage = color ? `${color}${message}${colors.reset}` : message;
  console.log(formattedMessage);
  fs.appendFileSync(logFile, `${message}\n`);
}

// Function to execute AWS CLI commands
function executeAwsCommand(command) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    return { success: true, data: JSON.parse(output) };
  } catch (error) {
    const errorMessage = error.stderr ? error.stderr.toString() : error.message;
    log(`Command failed: ${command}`, colors.red);
    log(`Error: ${errorMessage}`, colors.red);
    return { success: false, error: errorMessage };
  }
}

// Get the AWS region
function getAwsRegion() {
  try {
    return process.env.AWS_REGION || 
           execSync('aws configure get region', { encoding: 'utf8' }).trim() || 
           'us-east-1';
  } catch (error) {
    log('Could not determine AWS region, defaulting to us-east-1', colors.yellow);
    return 'us-east-1';
  }
}

// Find stacks with the 'amplify-linkgeneratorandwrapperadmin' prefix
function findAmplifyStacks(region) {
  log(`Searching for Amplify stacks in ${region}...`, colors.cyan);
  
  const result = executeAwsCommand(`aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE CREATE_FAILED CREATE_IN_PROGRESS ROLLBACK_COMPLETE ROLLBACK_FAILED ROLLBACK_IN_PROGRESS UPDATE_COMPLETE UPDATE_FAILED UPDATE_ROLLBACK_COMPLETE UPDATE_ROLLBACK_FAILED UPDATE_ROLLBACK_IN_PROGRESS --region ${region}`);
  
  if (!result.success) {
    log('Failed to list CloudFormation stacks', colors.red);
    return [];
  }
  
  const amplifyStacks = result.data.StackSummaries.filter(stack => 
    stack.StackName.includes('amplify-linkgeneratorandwrapperadmin')
  );
  
  log(`Found ${amplifyStacks.length} Amplify stacks`, colors.green);
  return amplifyStacks;
}

// Get detailed information about a stack
function getStackDetails(stackName, region) {
  log(`Fetching details for stack: ${stackName}`, colors.blue);
  
  const result = executeAwsCommand(`aws cloudformation describe-stacks --stack-name ${stackName} --region ${region}`);
  
  if (!result.success) {
    log(`Failed to get details for stack ${stackName}`, colors.red);
    return null;
  }
  
  return result.data.Stacks[0];
}

// Get stack resources
function getStackResources(stackName, region) {
  log(`Fetching resources for stack: ${stackName}`, colors.blue);
  
  const result = executeAwsCommand(`aws cloudformation list-stack-resources --stack-name ${stackName} --region ${region}`);
  
  if (!result.success) {
    log(`Failed to get resources for stack ${stackName}`, colors.red);
    return [];
  }
  
  return result.data.StackResourceSummaries;
}

// Get stack events, focusing on failures
function getStackEvents(stackName, region) {
  log(`Fetching events for stack: ${stackName}`, colors.blue);
  
  const result = executeAwsCommand(`aws cloudformation describe-stack-events --stack-name ${stackName} --region ${region}`);
  
  if (!result.success) {
    log(`Failed to get events for stack ${stackName}`, colors.red);
    return [];
  }
  
  // Focus on the most recent events, especially failures
  const recentEvents = result.data.StackEvents.slice(0, 50);
  const failureEvents = recentEvents.filter(event => 
    event.ResourceStatus.includes('FAILED')
  );
  
  return { all: recentEvents, failures: failureEvents };
}

// Format stack status with color
function formatStatus(status) {
  if (status.includes('COMPLETE')) {
    return `${colors.green}${status}${colors.reset}`;
  } else if (status.includes('FAILED') || status.includes('ROLLBACK')) {
    return `${colors.red}${status}${colors.reset}`;
  } else if (status.includes('IN_PROGRESS')) {
    return `${colors.blue}${status}${colors.reset}`;
  } else {
    return status;
  }
}

// Extract useful information from a CDK failure
function analyzeCdkFailure(events) {
  const cdkFailures = [];
  
  for (const event of events) {
    if (event.ResourceStatus.includes('FAILED')) {
      const reason = event.ResourceStatusReason || 'No reason provided';
      
      // Special handling for asset publishing failures
      if (reason.includes('Asset publishing failed') || reason.includes('S3')) {
        cdkFailures.push({
          resource: event.LogicalResourceId,
          reason,
          type: 'AssetPublishing',
          solution: 'Check IAM permissions for S3 access and verify CDK bootstrap is complete.'
        });
      } 
      // VTL template issues
      else if (reason.includes('VTL') || reason.includes('template') || reason.includes('resolver')) {
        cdkFailures.push({
          resource: event.LogicalResourceId,
          reason,
          type: 'TemplateError',
          solution: 'Review your GraphQL schema and VTL templates for syntax errors.'
        });
      }
      // IAM permission issues
      else if (reason.includes('permissions') || reason.includes('not authorized') || reason.includes('AccessDenied')) {
        cdkFailures.push({
          resource: event.LogicalResourceId,
          reason,
          type: 'IAMPermissions',
          solution: 'Ensure your AWS user/role has sufficient permissions to create the required resources.'
        });
      }
      // General failures
      else {
        cdkFailures.push({
          resource: event.LogicalResourceId,
          reason,
          type: 'Other',
          solution: 'Check the CloudFormation console for more details.'
        });
      }
    }
  }
  
  return cdkFailures;
}

// Main function to check stack status
async function checkAmplifyStacks() {
  log('🔍 Starting CloudFormation Stack Analysis for Amplify Gen 2', colors.cyan);
  log(`📝 Detailed logs will be saved to: ${logFile}`, colors.blue);
  
  const region = getAwsRegion();
  const stacks = findAmplifyStacks(region);
  
  if (stacks.length === 0) {
    log('No Amplify stacks found. Make sure you have initiated a deployment.', colors.yellow);
    return;
  }
  
  log('\n📊 Stack Summary:', colors.magenta);
  log('------------------------------------------------------------------------------', colors.magenta);
  log('Stack Name                                              Status         Created', colors.cyan);
  log('------------------------------------------------------------------------------', colors.magenta);
  
  stacks.forEach(stack => {
    const creationTime = new Date(stack.CreationTime).toISOString().split('T')[0];
    const paddedName = stack.StackName.padEnd(55);
    const status = formatStatus(stack.StackStatus);
    log(`${paddedName} ${status.padEnd(20)} ${creationTime}`);
  });
  
  log('------------------------------------------------------------------------------\n', colors.magenta);
  
  // Identify stacks with issues
  const failedStacks = stacks.filter(stack => 
    stack.StackStatus.includes('FAILED') || 
    stack.StackStatus.includes('ROLLBACK')
  );
  
  if (failedStacks.length > 0) {
    log('⚠️ Failed Stacks Detected!', colors.red);
    
    for (const stack of failedStacks) {
      log(`\n🔍 Analyzing failed stack: ${stack.StackName}`, colors.yellow);
      
      const details = getStackDetails(stack.StackName, region);
      if (!details) continue;
      
      const events = getStackEvents(stack.StackName, region);
      const failures = analyzeCdkFailure(events.failures);
      
      log(`Stack Status: ${formatStatus(details.StackStatus)}`, colors.yellow);
      if (details.StackStatusReason) {
        log(`Failure Reason: ${details.StackStatusReason}`, colors.red);
      }
      
      if (failures.length > 0) {
        log('\n🐛 Failure Analysis:', colors.red);
        failures.forEach((failure, index) => {
          log(`\nFailure #${index + 1}: ${failure.type}`, colors.yellow);
          log(`Resource: ${failure.resource}`, colors.blue);
          log(`Reason: ${failure.reason}`, colors.red);
          log(`Suggested Solution: ${failure.solution}`, colors.green);
        });
      }
      
      if (failures.some(f => f.type === 'AssetPublishing')) {
        log('\n🔧 Recommended Fix for Asset Publishing Issues:', colors.green);
        log('1. Ensure your CDK environment is properly bootstrapped:', colors.yellow);
        log('   npx cdk bootstrap', colors.blue);
        log('2. Check that your IAM user/role has S3 permissions:', colors.yellow);
        log('   - s3:PutObject', colors.blue);
        log('   - s3:GetObject', colors.blue);
        log('   - s3:ListBucket', colors.blue);
        log('3. Try deploying with the asset hotswap option:', colors.yellow);
        log('   npx cdk deploy --hotswap', colors.blue);
        log('4. For local testing, use the Amplify sandbox:', colors.yellow);
        log('   npx ampx sandbox', colors.blue);
      }
      
      if (failures.some(f => f.type === 'TemplateError')) {
        log('\n🔧 Recommended Fix for VTL Template Issues:', colors.green);
        log('1. Run the VTL template checker script:', colors.yellow);
        log('   npm run fix-vtl', colors.blue);
        log('2. Verify your GraphQL schema in amplify/data/resource.ts:', colors.yellow);
        log('3. Try recreating default templates by modifying your schema slightly and resyncing:', colors.yellow);
        log('   npx ampx generate', colors.blue);
      }
    }
  } else {
    const inProgressStacks = stacks.filter(stack => stack.StackStatus.includes('IN_PROGRESS'));
    
    if (inProgressStacks.length > 0) {
      log('⏳ Stacks are currently being deployed or updated.', colors.blue);
      log('   You can check the AWS CloudFormation console for real-time progress.', colors.blue);
    } else {
      log('✅ All stacks appear to be in a stable state. No issues detected.', colors.green);
    }
  }
  
  // Check for nested stacks - these often contain the actual resources
  log('\n🔍 Checking for nested stacks...', colors.cyan);
  
  for (const stack of stacks) {
    if (!stack.StackName.includes('nested')) {  // Only check parent stacks
      const resources = getStackResources(stack.StackName, region);
      const nestedStacks = resources.filter(res => res.ResourceType === 'AWS::CloudFormation::Stack');
      
      if (nestedStacks.length > 0) {
        log(`\nFound ${nestedStacks.length} nested stacks in ${stack.StackName}:`, colors.blue);
        
        for (const nestedStack of nestedStacks) {
          const statusColor = nestedStack.ResourceStatus.includes('COMPLETE') ? colors.green :
                              nestedStack.ResourceStatus.includes('FAILED') ? colors.red : colors.yellow;
          
          log(`  - ${nestedStack.LogicalResourceId}: ${statusColor}${nestedStack.ResourceStatus}${colors.reset}`, colors.blue);
          
          // If there's a failed nested stack, check its events
          if (nestedStack.ResourceStatus.includes('FAILED')) {
            log(`    ⚠️ This nested stack has failed. Physical ID: ${nestedStack.PhysicalResourceId}`, colors.red);
            
            // Extract the nested stack name from the physical ID
            const nestedStackName = nestedStack.PhysicalResourceId.split('/').pop();
            
            try {
              const nestedEvents = getStackEvents(nestedStackName, region);
              if (nestedEvents.failures.length > 0) {
                log('    📝 Failure details:', colors.red);
                nestedEvents.failures.slice(0, 3).forEach(event => {
                  log(`      ${event.LogicalResourceId}: ${event.ResourceStatusReason}`, colors.red);
                });
              }
            } catch (error) {
              log(`    Could not retrieve nested stack events: ${error.message}`, colors.red);
            }
          }
        }
      } else {
        log(`No nested stacks found in ${stack.StackName}`, colors.blue);
      }
    }
  }
  
  // Final notes
  log('\n📝 Additional Notes and Recommendations:', colors.cyan);
  log('1. For deploying with detailed logging, use:', colors.blue);
  log('   AMPLIFY_DEBUG=true npx ampx deploy --force', colors.yellow);
  
  log('2. To bypass CloudFormation for faster testing, use:', colors.blue);
  log('   npm run deploy:sandbox', colors.yellow);
  
  log('3. For a deeper analysis, run the AWS environment validator:', colors.blue);
  log('   node scripts/validate-aws-env.js', colors.yellow);
  
  log('\n✅ Analysis complete! Check the log file for full details:', colors.green);
  log(logFile, colors.yellow);
}

// Run the checker
checkAmplifyStacks().catch(error => {
  log(`Error running checker: ${error.message}`, colors.red);
  process.exit(1);
});
