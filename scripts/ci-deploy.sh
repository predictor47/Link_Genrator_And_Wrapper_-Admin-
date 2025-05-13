#!/bin/bash
# CI/CD Deployment script that handles asset publishing for GitHub deployments
# This script is called from amplify.yml during CI/CD deployments

echo "🚀 Starting CI/CD deployment for Amplify Gen 2..."
echo "=================================================="

# Function to log messages with timestamp
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 1. Set up AWS environment
log "Setting up AWS environment..."
AWS_REGION=${AWS_REGION:-$(aws configure get region || echo "us-east-1")}
AWS_ACCOUNT=$(aws sts get-caller-identity --query "Account" --output text)
log "Using AWS region: $AWS_REGION, Account: $AWS_ACCOUNT"

# 2. First try standard deployment
log "Attempting standard Amplify deployment..."
npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID || true

# 3. Check if deployment succeeded by looking for completed stacks
log "Checking deployment status..."
STACK_NAME="amplify-$AWS_APP_ID-$AWS_BRANCH"
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION --query "Stacks[0].StackStatus" --output text 2>/dev/null || echo "NOT_FOUND")

if [[ "$STACK_STATUS" == "CREATE_COMPLETE" || "$STACK_STATUS" == "UPDATE_COMPLETE" ]]; then
  log "✅ Deployment succeeded! Stack status: $STACK_STATUS"
  exit 0
fi

log "⚠️ Deployment not complete. Status: $STACK_STATUS. Proceeding with manual asset publishing..."

# 4. Get CDK bootstrap bucket
log "Looking for CDK bootstrap bucket..."
CDK_BUCKET=$(aws cloudformation describe-stacks --stack-name CDKToolkit --region $AWS_REGION --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text 2>/dev/null || echo "")

if [ -z "$CDK_BUCKET" ]; then
  log "ℹ️ CDK bootstrap bucket not found. Running CDK bootstrap..."
  npx cdk bootstrap aws://$AWS_ACCOUNT/$AWS_REGION
  
  # Try to get the bucket again
  CDK_BUCKET=$(aws cloudformation describe-stacks --stack-name CDKToolkit --region $AWS_REGION --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text 2>/dev/null || echo "")
  
  if [ -z "$CDK_BUCKET" ]; then
    log "❌ Failed to find CDK bootstrap bucket after bootstrapping."
    exit 1
  fi
fi

log "✅ Found CDK bootstrap bucket: $CDK_BUCKET"

# 5. Manually publish assets to S3
log "Manually publishing CloudFormation templates to S3..."

# Check if cdk.out directory exists
if [ ! -d "./cdk.out" ]; then
  log "❌ cdk.out directory not found. Running CDK synthesis first..."
  npx cdk synth
  
  if [ ! -d "./cdk.out" ]; then
    log "❌ Failed to generate cdk.out directory. Exiting."
    exit 1
  fi
fi

# Find the asset manifest file
ASSET_MANIFEST=$(find ./cdk.out -name "*.assets.json" | head -1)

if [ -z "$ASSET_MANIFEST" ]; then
  log "❌ No asset manifest found in cdk.out directory."
  exit 1
fi

log "Found asset manifest: $ASSET_MANIFEST"

# Copy all CloudFormation templates to S3
log "Copying all CloudFormation templates to S3..."
find ./cdk.out -name "*.template.json" | while read template; do
  filename=$(basename "$template")
  aws s3 cp "$template" "s3://$CDK_BUCKET/$filename" --acl bucket-owner-full-control
  log "✅ Uploaded $filename to S3"
done

# 6. Try deployment again after manual asset publishing
log "Retrying deployment after manual asset publishing..."
npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID

# 7. Check final deployment status
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION --query "Stacks[0].StackStatus" --output text 2>/dev/null || echo "NOT_FOUND")

if [[ "$STACK_STATUS" == "CREATE_COMPLETE" || "$STACK_STATUS" == "UPDATE_COMPLETE" ]]; then
  log "🎉 Deployment succeeded after manual asset publishing! Stack status: $STACK_STATUS"
  exit 0
else
  log "❌ Deployment still failed. Final stack status: $STACK_STATUS"
  exit 1
fi
