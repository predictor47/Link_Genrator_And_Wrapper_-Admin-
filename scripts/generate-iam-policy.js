#!/usr/bin/env node

/**
 * IAM Policy Generator for AWS Amplify Gen 2
 * 
 * This script generates the minimum IAM policy required for Amplify Gen 2 deployment,
 * which can be attached to your IAM user or role to fix permission issues.
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
  cyan: '\x1b[36m'
};

// Create output directory
const outputDir = path.join(process.cwd(), 'aws-policies');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Check AWS region
async function getAwsRegion() {
  try {
    const { stdout } = await exec('aws configure get region');
    return stdout.trim() || process.env.AWS_REGION || 'us-east-1';
  } catch (error) {
    console.log(`${colors.yellow}Could not determine AWS region, defaulting to us-east-1${colors.reset}`);
    return 'us-east-1';
  }
}

// Get AWS account ID
async function getAwsAccountId() {
  try {
    const { stdout } = await exec('aws sts get-caller-identity --query "Account" --output text');
    return stdout.trim();
  } catch (error) {
    console.error(`${colors.red}Error: Could not determine AWS account ID. Make sure AWS CLI is configured correctly.${colors.reset}`);
    process.exit(1);
  }
}

// Get bootstrap bucket name
async function getBootstrapBucket(region) {
  try {
    const { stdout } = await exec(
      `aws cloudformation describe-stacks --stack-name CDKToolkit --region ${region} --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text`
    );
    return stdout.trim();
  } catch (error) {
    console.log(`${colors.yellow}CDK bootstrap stack not found. You may need to run 'npx cdk bootstrap'.${colors.reset}`);
    return null;
  }
}

// Generate IAM policy for CDK asset publishing
async function generateCdkAssetPolicy() {
  console.log(`${colors.cyan}Generating CDK Asset Publishing IAM Policy...${colors.reset}`);
  
  const region = await getAwsRegion();
  const accountId = await getAwsAccountId();
  const bootstrapBucket = await getBootstrapBucket(region);
  
  console.log(`${colors.green}AWS Region: ${region}${colors.reset}`);
  console.log(`${colors.green}AWS Account ID: ${accountId}${colors.reset}`);
  
  if (bootstrapBucket) {
    console.log(`${colors.green}CDK Bootstrap Bucket: ${bootstrapBucket}${colors.reset}`);
  } else {
    console.log(`${colors.yellow}No CDK bootstrap bucket found. The policy will use a placeholder.${colors.reset}`);
  }
  
  const bucketName = bootstrapBucket || `cdk-hnb659fds-assets-${accountId}-${region}`;
  
  // Create the policy document
  const policy = {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "cloudformation:DescribeStacks",
          "cloudformation:DescribeStackEvents",
          "cloudformation:DescribeStackResources",
          "cloudformation:GetTemplate",
          "cloudformation:ListStackResources",
          "cloudformation:CreateStack",
          "cloudformation:UpdateStack"
        ],
        "Resource": [
          `arn:aws:cloudformation:${region}:${accountId}:stack/CDKToolkit/*`,
          `arn:aws:cloudformation:${region}:${accountId}:stack/amplify-*`
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:GetObjectVersion"
        ],
        "Resource": [
          `arn:aws:s3:::${bucketName}`,
          `arn:aws:s3:::${bucketName}/*`
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "appsync:CreateGraphqlApi",
          "appsync:UpdateGraphqlApi",
          "appsync:DeleteGraphqlApi",
          "appsync:GetGraphqlApi",
          "appsync:CreateDataSource",
          "appsync:UpdateDataSource",
          "appsync:DeleteDataSource",
          "appsync:CreateResolver",
          "appsync:UpdateResolver",
          "appsync:DeleteResolver",
          "appsync:CreateApiKey",
          "appsync:UpdateApiKey",
          "appsync:DeleteApiKey",
          "appsync:ListResolvers",
          "appsync:ListDataSources",
          "appsync:GetDataSource",
          "appsync:GetResolver"
        ],
        "Resource": [
          `arn:aws:appsync:${region}:${accountId}:apis/*`
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:CreateTable",
          "dynamodb:DescribeTable",
          "dynamodb:UpdateTable",
          "dynamodb:DeleteTable",
          "dynamodb:DescribeContinuousBackups",
          "dynamodb:UpdateContinuousBackups",
          "dynamodb:DescribeTimeToLive",
          "dynamodb:UpdateTimeToLive"
        ],
        "Resource": [
          `arn:aws:dynamodb:${region}:${accountId}:table/*`
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "cognito-idp:CreateUserPool",
          "cognito-idp:DeleteUserPool",
          "cognito-idp:UpdateUserPool",
          "cognito-idp:DescribeUserPool",
          "cognito-idp:CreateUserPoolClient",
          "cognito-idp:UpdateUserPoolClient",
          "cognito-idp:DeleteUserPoolClient",
          "cognito-idp:CreateIdentityProvider",
          "cognito-idp:UpdateIdentityProvider",
          "cognito-idp:DeleteIdentityProvider"
        ],
        "Resource": [
          `arn:aws:cognito-idp:${region}:${accountId}:userpool/*`
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "iam:PassRole",
          "iam:GetRole",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:PutRolePolicy",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy"
        ],
        "Resource": [
          `arn:aws:iam::${accountId}:role/amplify-*`
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "lambda:CreateFunction",
          "lambda:DeleteFunction",
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:GetFunction",
          "lambda:AddPermission",
          "lambda:RemovePermission"
        ],
        "Resource": [
          `arn:aws:lambda:${region}:${accountId}:function:amplify-*`
        ]
      }
    ]
  };
  
  // Write the policy to a file
  const policyPath = path.join(outputDir, 'amplify-gen2-deployment-policy.json');
  fs.writeFileSync(policyPath, JSON.stringify(policy, null, 2));
  
  console.log(`${colors.green}Policy file created at: ${policyPath}${colors.reset}`);
  
  // Create a shell script to apply this policy
  const scriptContent = `#!/bin/bash

# This script applies the minimum required permissions for Amplify Gen 2 deployment
# Run this script with AWS credentials that have IAM permissions

# Set variables
POLICY_NAME="AmplifyGen2DeploymentPolicy"
POLICY_DOCUMENT="./aws-policies/amplify-gen2-deployment-policy.json"
USER_NAME=$(aws sts get-caller-identity --query "Arn" --output text | cut -d '/' -f 2)

# Create the policy
echo "Creating policy $POLICY_NAME..."
POLICY_ARN=$(aws iam create-policy --policy-name $POLICY_NAME --policy-document file://$POLICY_DOCUMENT --query "Policy.Arn" --output text)

if [ $? -ne 0 ]; then
  echo "Failed to create policy. It might already exist."
  POLICY_ARN=$(aws iam list-policies --query "Policies[?PolicyName=='$POLICY_NAME'].Arn" --output text)
  if [ -z "$POLICY_ARN" ]; then
    echo "Could not find existing policy. Please check your IAM permissions."
    exit 1
  fi
  echo "Found existing policy: $POLICY_ARN"
fi

# Attach the policy to the current user
echo "Attaching policy to user $USER_NAME..."
aws iam attach-user-policy --user-name $USER_NAME --policy-arn $POLICY_ARN

if [ $? -eq 0 ]; then
  echo "✅ Policy attached successfully!"
  echo "You should now be able to deploy Amplify Gen 2 applications."
else
  echo "❌ Failed to attach policy. You may need to attach it manually in the AWS console."
  echo "Policy ARN: $POLICY_ARN"
fi

echo "Note: It might take a few minutes for the permissions to propagate."
`;
  
  const scriptPath = path.join(outputDir, 'apply-deployment-policy.sh');
  fs.writeFileSync(scriptPath, scriptContent);
  fs.chmodSync(scriptPath, 0o755); // Make executable
  
  console.log(`${colors.green}Script created at: ${scriptPath}${colors.reset}`);
  console.log(`${colors.yellow}You can run this script to apply the policy to your current IAM user.${colors.reset}`);
  
  // Create instructions for manual application
  console.log(`\n${colors.cyan}Instructions for manual application:${colors.reset}`);
  console.log(`${colors.yellow}1. Go to AWS IAM Console${colors.reset}`);
  console.log(`${colors.yellow}2. Go to Policies > Create Policy${colors.reset}`);
  console.log(`${colors.yellow}3. Select JSON and paste the contents of the policy file${colors.reset}`);
  console.log(`${colors.yellow}4. Name it "AmplifyGen2DeploymentPolicy" and create it${colors.reset}`);
  console.log(`${colors.yellow}5. Go to Users > Your User > Add Permissions${colors.reset}`);
  console.log(`${colors.yellow}6. Attach the policy you just created${colors.reset}`);
  
  return policyPath;
}

// Main function
async function main() {
  console.log(`${colors.cyan}AWS Amplify Gen 2 IAM Policy Generator${colors.reset}`);
  console.log(`${colors.cyan}========================================${colors.reset}\n`);
  
  try {
    // Check if AWS CLI is configured
    await exec('aws sts get-caller-identity');
    
    const policyPath = await generateCdkAssetPolicy();
    
    console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
    console.log(`${colors.yellow}1. Apply the policy using the generated script:${colors.reset}`);
    console.log(`   bash ${path.relative(process.cwd(), path.join(outputDir, 'apply-deployment-policy.sh'))}`);
    console.log(`${colors.yellow}2. Try deploying your Amplify application again:${colors.reset}`);
    console.log(`   npx ampx deploy --force`);
    
  } catch (error) {
    console.error(`${colors.red}Error: AWS CLI is not configured or not available.${colors.reset}`);
    console.error(`${colors.yellow}Please run 'aws configure' to set up your AWS credentials.${colors.reset}`);
  }
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}An error occurred: ${error.message}${colors.reset}`);
});
