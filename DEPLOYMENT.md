# Deployment Workflow for Amplify Gen 2

This document outlines the simplified Git-based deployment workflow for the Survey Link Wrapper application using AWS Amplify Gen 2.

## Prerequisites

1. GitHub repository connected to AWS Amplify app in the AWS console
2. Node.js 22.15.0 or later
3. Git installed and configured

## Deployment Steps

### 1. Initial Setup (Already Done)

The project is already set up with Amplify Gen 2 and connected to a GitHub repository.

### 2. Deployment Process

Simply push your changes to the connected GitHub repository:

```bash
# Add all changes
git add .

# Commit changes
git commit -m "Your descriptive commit message"

# Push to GitHub
git push origin main
```

AWS Amplify will automatically:
1. Detect the changes in the GitHub repository
2. Pull the latest code
3. Deploy the backend resources using the configurations in the amplify/ directory
4. Build and deploy the frontend application

### 3. Local Development

For local development and testing, use the sandbox mode:

```bash
# Deploy to local sandbox
npm run deploy:sandbox
```

### 4. Creating Admin Users

After deployment, create an admin user:

```bash
# Create admin user
npm run create-admin
```

### 5. Testing API Connection

Verify your deployment by testing the API:

```bash
# Test GraphQL API
npm run test-graphql

# Validate API endpoints
npm run validate-api
```

## Monitoring Deployment

You can monitor the deployment status in the AWS Amplify Console:

1. Open the AWS Management Console
2. Navigate to AWS Amplify
3. Select your application
4. Check the Deployment Status tab

## Troubleshooting

If you encounter issues with deployment:

1. Check the Amplify logs in the AWS Console
2. Verify your amplify.yml configuration
3. Ensure your GitHub repository has the correct permissions
4. Check that Node.js version in package.json matches the version in amplify.yml


