#!/bin/bash

echo "📦 Starting amplify deployment with enhanced debugging..."

# Set AWS region if not already set
export AWS_REGION=${AWS_REGION:-"us-east-1"}
echo "🌎 Using AWS region: $AWS_REGION"

# Create the logs directory if it doesn't exist
mkdir -p ./logs

# Set log file
LOG_FILE="./logs/deploy-$(date +%Y%m%d-%H%M%S).log"
echo "📝 Logging to $LOG_FILE"

# Function to log messages
log() {
  echo "$1" | tee -a $LOG_FILE
}

# Check AWS credentials
log "🔑 Checking AWS credentials..."
if ! aws sts get-caller-identity >> $LOG_FILE 2>&1; then
  log "❌ AWS credentials not configured properly. Please run 'aws configure' or set proper environment variables."
  exit 1
fi
log "✅ AWS credentials valid"

# Run CDK bootstrap explicitly first
log "🚀 Bootstrapping CDK environment..."
npx cdk bootstrap >> $LOG_FILE 2>&1
if [ $? -ne 0 ]; then
  log "❌ CDK bootstrap failed. Check $LOG_FILE for details."
  exit 1
fi
log "✅ CDK bootstrap completed"

# Run the Amplify deployment with additional flags
log "🚀 Deploying Amplify backend..."
AMPLIFY_DEBUG=true npx ampx deploy --force --no-watch >> $LOG_FILE 2>&1
DEPLOY_STATUS=$?

if [ $DEPLOY_STATUS -ne 0 ]; then
  log "❌ Amplify deployment failed."
  log "📑 Error info:"
  
  # Print the most relevant error information from the log
  grep -A 10 "Error:" $LOG_FILE | head -20
  
  # Search for common VTL-related errors
  if grep -q "VTL" $LOG_FILE; then
    log "🔍 Detected VTL (Velocity Template Language) errors in deployment."
    log "👉 Recommended fix: Check your GraphQL schema resolvers in amplify/data/resource.ts"
  fi

  # Search for CDK asset publishing errors
  if grep -q "Asset publishing" $LOG_FILE || grep -q "Failed to publish" $LOG_FILE; then
    log "🔍 Detected CDK asset publishing errors."
    log "👉 Attempting to fix asset publishing issues automatically..."
    
    # Get the AWS account ID
    AWS_ACCOUNT=$(aws sts get-caller-identity --query "Account" --output text)
    
    # Get the CDK bootstrap bucket name
    CDK_BUCKET=$(aws cloudformation describe-stacks --stack-name CDKToolkit --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)
    
    if [ -n "$CDK_BUCKET" ]; then
      log "✅ Found CDK bootstrap bucket: $CDK_BUCKET"
      
      # Test S3 access by uploading a test file
      TEST_FILE="test-s3-access.txt"
      echo "Test file for S3 access" > $TEST_FILE
      
      log "🔧 Testing S3 bucket permissions..."
      if aws s3 cp $TEST_FILE s3://$CDK_BUCKET/test-$(date +%s).txt; then
        log "✅ S3 permissions are valid - this is not the cause of the error"
        rm $TEST_FILE
      else
        log "❌ S3 permissions issue detected! Running IAM policy generator..."
        node scripts/generate-iam-policy.js
        log "👉 Please follow the instructions above to fix S3 permissions"
        rm $TEST_FILE
        exit 1
      fi
      
      # Try direct sync of all assets to the CDK bootstrap bucket
      log "🔄 Attempting direct sync of assets to S3 bucket..."
      ASSETS_COUNT=$(find cdk.out -name "asset.*" | wc -l)
      log "📦 Found $ASSETS_COUNT assets to sync"
      
      aws s3 cp cdk.out/ s3://$CDK_BUCKET/ --recursive --include "asset.*" >> $LOG_FILE 2>&1
      if [ $? -eq 0 ]; then
        log "✅ Successfully synced assets to S3 bucket"
        
        # Try deployment again after syncing assets
        log "🔄 Retrying deployment after asset sync..."
        AMPLIFY_DEBUG=true npx ampx deploy --force >> $LOG_FILE 2>&1
        if [ $? -eq 0 ]; then
          log "✅ Deployment succeeded after manual asset sync!"
          exit 0
        fi
      else
        log "❌ Failed to sync assets to S3 bucket"
      fi
      
      # As a last resort, try using the hotswap deployment
      log "🔄 Trying alternative deployment method with asset hotswap..."
      npx cdk deploy --hotswap >> $LOG_FILE 2>&1
      if [ $? -eq 0 ]; then
        log "✅ Hotswap deployment succeeded!"
        exit 0
      else
        log "❌ Hotswap deployment also failed."
      fi
    else
      log "❌ CDK bootstrap bucket not found. You need to bootstrap first:"
      log "   npx cdk bootstrap aws://$AWS_ACCOUNT/$AWS_REGION"
    fi
    
    # Last resort: Try a manual CloudFormation deployment if we have a template
    if [ -f "cdk.out/amplify-linkgeneratorandwrapperadmin-dev-sandbox-6ccb6c8938.template.json" ]; then
      log "⚠️ Attempting a direct CloudFormation deployment as last resort..."
      
      # Craft a stack name based on cdk.json
      STACK_NAME="amplify-linkgeneratorandwrapperadmin-dev-sandbox"
      if [ -f "cdk.json" ]; then
        NAMESPACE=$(grep -o '"amplify-backend-namespace": "[^"]*' cdk.json | cut -d'"' -f4)
        NAME=$(grep -o '"amplify-backend-name": "[^"]*' cdk.json | cut -d'"' -f4)
        TYPE=$(grep -o '"amplify-backend-type": "[^"]*' cdk.json | cut -d'"' -f4)
        
        if [ -n "$NAMESPACE" ] && [ -n "$NAME" ] && [ -n "$TYPE" ]; then
          STACK_NAME="amplify-${NAMESPACE}-${NAME}-${TYPE}"
          log "📋 Using stack name: $STACK_NAME"
        fi
      fi
      
      # Check if stack exists
      aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION >> $LOG_FILE 2>&1
      STACK_EXISTS=$?
      
      if [ $STACK_EXISTS -eq 0 ]; then
        # Update existing stack
        log "🔄 Updating existing CloudFormation stack..."
        aws cloudformation update-stack \
          --stack-name $STACK_NAME \
          --template-body file://cdk.out/amplify-linkgeneratorandwrapperadmin-dev-sandbox-6ccb6c8938.template.json \
          --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
          --region $AWS_REGION >> $LOG_FILE 2>&1
      else
        # Create new stack
        log "🔄 Creating new CloudFormation stack..."
        aws cloudformation create-stack \
          --stack-name $STACK_NAME \
          --template-body file://cdk.out/amplify-linkgeneratorandwrapperadmin-dev-sandbox-6ccb6c8938.template.json \
          --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
          --region $AWS_REGION >> $LOG_FILE 2>&1
      fi
      
      if [ $? -eq 0 ]; then
        log "✅ CloudFormation deployment initiated successfully!"
        log "⏳ The deployment will continue in the background."
        log "👉 Check the AWS CloudFormation console for progress."
        exit 0
      else
        log "❌ Direct CloudFormation deployment failed."
      fi
    fi
    
    log "💡 Additional troubleshooting steps:"
    log "1. Check 'CDK_TROUBLESHOOTING.md' for detailed solutions"
    log "2. Run 'npm run check-aws' to validate your AWS environment"
    log "3. Run 'npm run check-stacks' to analyze CloudFormation stacks"
    log "4. Run 'npm run direct-fix' for a simple asset sync"
    log "5. Run 'npm run fix-assets' for comprehensive asset fixing"
  fi
  
  exit 1
else
  log "✅ Amplify deployment completed successfully!"
  
  # Run post-deployment validation
  log "🧪 Running API validation..."
  npm run validate-api
  
  log "✨ Deployment complete! Your backend is now ready."
fi

exit 0
