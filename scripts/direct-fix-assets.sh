#!/bin/bash
# This script directly fixes the most common CDK asset publishing error
# by manually syncing assets from cdk.out to the bootstrap bucket

echo "🔧 CDK Assets Direct Fix Tool"
echo "============================"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Get AWS region
AWS_REGION=${AWS_REGION:-$(aws configure get region)}
if [ -z "$AWS_REGION" ]; then
    AWS_REGION="us-east-1"
    echo "ℹ️ Using default region: $AWS_REGION"
else
    echo "ℹ️ Using region: $AWS_REGION"
fi

# Get AWS account ID
echo "🔍 Getting AWS account ID..."
AWS_ACCOUNT=$(aws sts get-caller-identity --query "Account" --output text)
if [ $? -ne 0 ]; then
    echo "❌ Failed to get AWS account ID. Check your credentials."
    exit 1
fi
echo "✅ AWS Account ID: $AWS_ACCOUNT"

# Get CDK bootstrap bucket
echo "🔍 Checking CDK bootstrap bucket..."
CDK_BUCKET=$(aws cloudformation describe-stacks --stack-name CDKToolkit --region $AWS_REGION --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)

if [ -z "$CDK_BUCKET" ]; then
    echo "❌ CDK bootstrap bucket not found. Running bootstrap now..."
    npx cdk bootstrap aws://$AWS_ACCOUNT/$AWS_REGION
    
    if [ $? -ne 0 ]; then
        echo "❌ CDK bootstrap failed. Please run 'npx cdk bootstrap' manually."
        exit 1
    fi
    
    # Try to get the bucket again
    CDK_BUCKET=$(aws cloudformation describe-stacks --stack-name CDKToolkit --region $AWS_REGION --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)
    
    if [ -z "$CDK_BUCKET" ]; then
        echo "❌ Still could not find CDK bootstrap bucket."
        exit 1
    fi
fi

echo "✅ Found CDK bootstrap bucket: $CDK_BUCKET"

# Check the cdk.out directory
if [ ! -d "cdk.out" ]; then
    echo "❌ cdk.out directory not found. Running CDK synth first..."
    npx cdk synth
    
    if [ ! -d "cdk.out" ]; then
        echo "❌ Failed to generate cdk.out directory."
        exit 1
    fi
fi

# Find VTL templates
echo "🔍 Finding VTL templates in cdk.out..."
VTL_FILES=$(find cdk.out -name "*.vtl" | wc -l)
echo "✅ Found $VTL_FILES VTL template files"

# Sync all assets from cdk.out to S3
echo "🚀 Syncing assets to CDK bootstrap bucket..."
aws s3 cp cdk.out s3://$CDK_BUCKET/ --recursive --exclude "*" --include "asset.*"

if [ $? -ne 0 ]; then
    echo "❌ Failed to sync assets to S3. Check your permissions."
    echo "👉 Try running: npm run generate-policy"
    exit 1
fi

echo "✅ Assets synced successfully!"
echo ""
echo "👉 Next steps:"
echo "1. Try deploying again with: npm run deploy"
echo "2. If that fails, try: npm run fix-assets"
echo "3. For detailed troubleshooting: see CDK_TROUBLESHOOTING.md"

exit 0
