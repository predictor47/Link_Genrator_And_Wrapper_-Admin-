# GitHub Deployment Emergency Guide

This guide provides emergency deployment steps if automated CI/CD on GitHub fails.

## Option 1: Run Deployment Scripts Locally

If GitHub deployment fails, you can run the deployment process from your local machine:

```bash
# 1. Pull the latest code
git pull

# 2. Run the complete repair script
bash scripts/complete-repair.sh

# 3. If that fails, try direct CloudFormation deployment
bash scripts/cloudformation-direct-deploy.sh
```

## Option 2: Manual Asset Publishing

If the CI/CD process is failing at the asset publishing stage:

```bash
# 1. Synthesize CloudFormation templates
npx cdk synth

# 2. Get your AWS account ID
AWS_ACCOUNT=$(aws sts get-caller-identity --query "Account" --output text)

# 3. Get your AWS region
AWS_REGION=$(aws configure get region || echo "us-east-1")

# 4. Get the CDK bootstrap bucket name
CDK_BUCKET=$(aws cloudformation describe-stacks --stack-name CDKToolkit --region $AWS_REGION --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)

# 5. Upload CloudFormation templates to the bucket
find ./cdk.out -name "*.template.json" | xargs -I {} aws s3 cp {} s3://$CDK_BUCKET/ --acl bucket-owner-full-control
```

## Option 3: Deploy to Amplify Gen 1 (Fallback)

If Amplify Gen 2 deployment continues to fail, you can quickly fallback to Amplify Gen 1:

```bash
# 1. Initialize Amplify Gen 1 project
amplify init

# Follow prompts to set up the project with same settings

# 2. Add auth
amplify add auth

# 3. Add API (if using AppSync)
amplify add api

# 4. Import your schema
cp amplify/data/schema.graphql ./amplify/backend/api/[YourApiName]/schema.graphql

# 5. Push to deploy
amplify push
```

## Option 4: Direct AWS Console Deployment

As a last resort, you can manually deploy through the AWS console:

1. Open the AWS Management Console
2. Navigate to CloudFormation
3. Click "Create stack" > "With new resources (standard)"
4. Upload the template file from `./cdk.out/*.template.json`
5. Follow the wizard to complete stack creation

## Checking Deployment Status

To verify your deployment was successful:

```bash
# Get Amplify outputs
aws cloudformation describe-stacks --stack-name amplify-[APP_ID]-[BRANCH] --query "Stacks[0].Outputs" --output json

# Check API endpoint
aws cloudformation describe-stacks --stack-name amplify-[APP_ID]-[BRANCH] --query "Stacks[0].Outputs[?OutputKey=='GraphQLAPIEndpointOutput'].OutputValue" --output text
```

## Creating Admin User After Deployment

After successful deployment, create an admin user:

```bash
# Get User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name amplify-[APP_ID]-[BRANCH] --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)

# Create admin user
aws cognito-idp admin-create-user --user-pool-id $USER_POOL_ID --username admin@example.com --user-attributes Name=email,Value=admin@example.com Name=email_verified,Value=true

# Set permanent password
aws cognito-idp admin-set-user-password --user-pool-id $USER_POOL_ID --username admin@example.com --password "Secure@Password123" --permanent
```
