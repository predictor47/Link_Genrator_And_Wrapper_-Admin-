#!/bin/bash

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
