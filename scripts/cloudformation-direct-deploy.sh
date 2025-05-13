#!/bin/bash
# CloudFormation Direct Deployment Script
# This script bypasses Amplify Gen 2 asset publishing by deploying CloudFormation templates directly

echo "🚀 Starting direct CloudFormation deployment for Amplify Gen 2..."
echo "=============================================================="

# Function to log messages with timestamp
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 1. Set up AWS environment
log "Setting up AWS environment..."
AWS_REGION=${AWS_REGION:-$(aws configure get region || echo "us-east-1")}
AWS_ACCOUNT=$(aws sts get-caller-identity --query "Account" --output text)
log "Using AWS region: $AWS_REGION, Account: $AWS_ACCOUNT"

# App and branch information
APP_ID=${AWS_APP_ID:-"d3dcjigg2d9vk2"}  # Default to the app ID in the logs if not provided
BRANCH=${AWS_BRANCH:-"main"}             # Default to main branch if not provided
STACK_NAME="amplify-${APP_ID}-${BRANCH}"

log "Using App ID: $APP_ID, Branch: $BRANCH, Stack name: $STACK_NAME"

# 2. Synthesize CDK templates if not already present
if [ ! -d "./cdk.out" ]; then
  log "Synthesizing CloudFormation templates..."
  npx cdk synth
fi

# 3. Find the main CloudFormation template
MAIN_TEMPLATE=$(find ./cdk.out -name "*.template.json" -not -name "*nested*" | head -1)

if [ -z "$MAIN_TEMPLATE" ]; then
  log "❌ No main CloudFormation template found. Exiting."
  exit 1
fi

log "Found main template: $MAIN_TEMPLATE"

# 4. Check if the stack already exists
log "Checking if stack $STACK_NAME already exists..."
STACK_EXISTS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION 2>&1 || echo "NOT_FOUND")

# 5. Deploy the CloudFormation stack
if [[ "$STACK_EXISTS" == *"NOT_FOUND"* ]]; then
  # Stack doesn't exist, create it
  log "Creating new CloudFormation stack: $STACK_NAME"
  aws cloudformation create-stack \
    --stack-name $STACK_NAME \
    --template-body file://$MAIN_TEMPLATE \
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
    --region $AWS_REGION
else
  # Stack exists, update it
  log "Updating existing CloudFormation stack: $STACK_NAME"
  aws cloudformation update-stack \
    --stack-name $STACK_NAME \
    --template-body file://$MAIN_TEMPLATE \
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
    --region $AWS_REGION || echo "No updates to perform"
fi

# 6. Wait for stack creation/update to complete
log "Waiting for stack operation to complete..."
aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $AWS_REGION 2>/dev/null || \
aws cloudformation wait stack-update-complete --stack-name $STACK_NAME --region $AWS_REGION 2>/dev/null

# 7. Check stack status
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION --query "Stacks[0].StackStatus" --output text)

if [[ "$STACK_STATUS" == "CREATE_COMPLETE" || "$STACK_STATUS" == "UPDATE_COMPLETE" ]]; then
  log "🎉 CloudFormation deployment succeeded! Stack status: $STACK_STATUS"
  
  # 8. Get stack outputs for important resources
  log "Retrieving stack outputs..."
  aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION --query "Stacks[0].Outputs" --output json > ./amplify_outputs.json
  
  log "✅ Deployment complete! Stack outputs saved to amplify_outputs.json"
  exit 0
else
  log "❌ CloudFormation deployment failed. Final stack status: $STACK_STATUS"
  
  # Get stack events for debugging
  log "Last 5 stack events:"
  aws cloudformation describe-stack-events --stack-name $STACK_NAME --region $AWS_REGION --query "StackEvents[0:5].[LogicalResourceId,ResourceStatus,ResourceStatusReason]" --output table
  
  exit 1
fi
