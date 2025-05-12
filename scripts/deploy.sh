#!/bin/bash
# Deployment script for AWS Amplify Gen 2 application

echo "🚀 Starting deployment process..."

# Check for AWS CLI and Amplify CLI
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI is not installed. Please install it first."
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx is not installed. Please install Node.js and npm first."
    exit 1
fi

# Set environment variables if not already set
if [ -z "$AMPLIFY_BACKEND_NAME" ]; then
    export AMPLIFY_BACKEND_NAME="dev"
    echo "ℹ️ Using default backend name: $AMPLIFY_BACKEND_NAME"
fi

if [ -z "$AMPLIFY_BACKEND_TYPE" ]; then
    export AMPLIFY_BACKEND_TYPE="sandbox"
    echo "ℹ️ Using default backend type: $AMPLIFY_BACKEND_TYPE"
fi

echo "🔧 Ensuring Amplify packages are installed..."
npm install --no-save @aws-amplify/backend-cli @aws-amplify/backend @aws-amplify/auth

echo "🔧 Configuring Amplify..."
npm run setup-amplify

echo "🚀 Deploying Amplify backend..."
npx ampx pipeline-deploy --yes

echo "🚀 Building and deploying frontend..."
npm run build

echo "✅ Deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Test your deployed application"
echo "2. Configure custom domain in Amplify Console"
echo "3. Set up CI/CD pipeline for automatic deployments"

exit 0
