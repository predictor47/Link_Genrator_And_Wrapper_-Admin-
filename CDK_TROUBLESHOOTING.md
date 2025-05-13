# CDK Asset Publishing Troubleshooting Guide

This document helps resolve the CDK asset publishing error encountered during deployment of the Amplify Gen 2 backend.

## Common Error Messages

```
Error: Asset publishing failed: Error publishing assets to s3://<bucket-name>/<asset-path>/...
```

## Root Causes and Solutions

### 1. S3 Permissions Issues

**Symptoms:**
- Error related to S3 access denied
- Mentions of IAM roles or policies

**Solution:**
1. Verify that your AWS user has sufficient permissions to access S3 and publish assets
2. Ensure your IAM role has `s3:PutObject`, `s3:GetObject`, and `s3:ListBucket` permissions
3. Run `aws s3 ls` to verify S3 access works correctly

### 2. VTL (Velocity Template Language) Template Issues

**Symptoms:**
- Error related to AppSync resolvers
- Mentions of VTL files or templates

**Solution:**
1. Check your GraphQL schema in `amplify/data/resource.ts` for any custom resolvers
2. Remove any custom VTL templates if not required
3. Use the default templates provided by Amplify Gen 2

### 3. CDK Bootstrap Environment Not Set Up

**Symptoms:**
- Error related to missing CDK assets bucket
- Mentions bootstrap environment

**Solution:**
1. Run `npx cdk bootstrap` to set up the CDK environment
2. Ensure the bootstrap command completes successfully before deployment

### 4. Invalid GraphQL Schema

**Symptoms:**
- Error related to GraphQL types or fields
- Mentions validation of schema

**Solution:**
1. Check your GraphQL schema for syntax errors
2. Ensure all relationships between models are properly defined
3. Fix any typos in field names or types

### 5. Automated Asset Publishing Fix

We've created a specialized tool to fix CDK asset publishing errors:

```bash
# Run the asset fixer script
npm run fix-assets
```

This script will:
1. Verify your AWS credentials and bootstrap status
2. Manually publish VTL templates to the CDK bootstrap bucket
3. Try deployment using CDK hotswap for faster updates
4. If needed, deploy directly using CloudFormation

### 6. Force Deployment to Overcome Stuck State

If none of the above solutions work, try:

```bash
# Clean local CDK state
rm -rf ./cdk.out

# Force-deploy with debug logging
AMPLIFY_DEBUG=true npx ampx deploy --force
```

## One-click Repair Solution

For the quickest and most comprehensive fix for CDK asset publishing errors, use our complete repair script:

```bash
npm run repair-all
```

This script will:
1. Clean up any temporary files
2. Validate your AWS environment
3. Bootstrap the CDK environment
4. Generate fresh CloudFormation templates
5. Fix VTL template issues
6. Attempt direct asset sync to S3
7. Try deployment with enhanced debugging
8. Use comprehensive asset fixing techniques
9. Analyze CloudFormation stacks for detailed errors
10. Generate recommended IAM policies

## Advanced Troubleshooting

### Examining CDK Assets

If you need to examine the generated CDK assets:

1. Look in the `.amplify/artifacts` directory for generated files
2. Check `cdk.out` directory for synthesized CloudFormation templates
3. Review asset manifests in `cdk.out/manifest.json`

### Using CDK Hotswap for Faster Deployments

For quicker iterations during development:

```bash
npx cdk deploy --hotswap
```

This bypasses CloudFormation for supported resource updates, which can help identify if the asset publishing is the issue.

### Bypass Asset Publishing Errors for Testing

As a last resort, you can use the local sandbox environment for testing:

```bash
npx ampx sandbox
```

This creates a local environment without CloudFormation deployment, allowing you to test your GraphQL API without AWS deployment.
