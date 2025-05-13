# Deployment Workflow for Amplify Gen 2

This document outlines the recommended deployment workflow for this Survey Link Wrapper application using AWS Amplify Gen 2.

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Node.js 22.15.0 or later
3. AWS CDK bootstrapped environment

## Deployment Steps

### 1. Initial Setup

```bash
# Install dependencies
npm install

# Set up Amplify configuration
npm run setup-amplify
```

### 2. Development Deployment

For local development and testing, use the sandbox mode:

```bash
# Deploy to local sandbox
npm run deploy:sandbox
```

### 3. Production Deployment

For production deployment, follow these steps:

```bash
# 1. Bootstrap CDK environment first
npx cdk bootstrap

# 2. Run the enhanced deployment script with debugging
bash scripts/deploy-with-debug.sh

# 3. After successful backend deployment, build frontend
npm run build
```

### 4. Troubleshooting CDK Asset Publishing Errors

If you encounter CDK asset publishing errors:

```bash
# 1. Check and fix VTL template issues
npm run fix-vtl

# 2. Try force deployment with debugging
AMPLIFY_DEBUG=true npx ampx deploy --force

# 3. If issues persist, try with CDK hotswap
npx cdk deploy --hotswap
```

See [CDK_TROUBLESHOOTING.md](./CDK_TROUBLESHOOTING.md) for detailed troubleshooting steps.

## Post-Deployment Verification

After successful deployment, verify your setup:

```bash
# Test GraphQL API connection
npm run test-graphql

# Validate API with Node.js client
npm run validate-api-node

# Create test admin user if needed
npm run create-test-user
```

## CI/CD Pipeline Deployment

For automated CI/CD pipelines:

```bash
# Set required environment variables
export BRANCH_NAME=main
export AMPLIFY_APP_ID=your-amplify-app-id

# Run CI deployment command
npm run deploy:ci
```

## Best Practices

1. Always bootstrap CDK before deployment
2. Use force flag only when necessary
3. Check logs in the `./logs` directory for detailed error information
4. Run post-deployment verification tests

## Common Issues

1. **S3 Access Denied**: Check IAM permissions for the deployment user
2. **VTL Template Errors**: Run `npm run fix-vtl` to identify and fix issues
3. **Asset Publishing Errors**: Ensure CDK is bootstrapped correctly
4. **API Connection Errors**: Verify API key in `amplify_outputs.json`

For more details about troubleshooting specific errors, refer to the [CDK_TROUBLESHOOTING.md](./CDK_TROUBLESHOOTING.md) document.

## Advanced Troubleshooting Tools

We've developed several specialized tools to diagnose and fix deployment issues:

### One-Click Repair Solution

```bash
# Run the complete automated repair process
npm run repair-all
```

This comprehensive script runs through all repair steps in sequence to fix any deployment issues.

### Specialized Tools

1. **Direct Asset Fix**
   ```bash
   npm run direct-fix
   ```
   Quickly resolves S3 asset publishing errors by syncing assets directly.

2. **Comprehensive Asset Fix**
   ```bash
   npm run fix-assets
   ```
   Advanced solution using multiple approaches to fix asset publishing.

3. **AWS Environment Validation**
   ```bash
   npm run check-aws
   ```
   Complete validation of your AWS setup for Amplify deployment.

4. **CloudFormation Stack Analysis**
   ```bash
   npm run check-stacks
   ```
   Detailed analysis of CloudFormation stacks with error reporting.

5. **IAM Policy Generation**
   ```bash
   npm run generate-policy
   ```
   Creates the necessary IAM policies for successful deployment.
