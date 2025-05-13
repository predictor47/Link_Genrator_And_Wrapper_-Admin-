#!/bin/bash
# Complete repair script for Amplify Gen 2 deployment issues
# This script runs through all available solutions in sequence

echo "🔧 Starting complete Amplify deployment repair process..."
echo "==================================================="

# Function to log messages with timestamp
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 1. Clean up any temporary files
log "Cleaning up temporary files..."
rm -rf ./cdk.out temp_deploy deployment_temp
mkdir -p logs

# 2. Check AWS credentials
log "Checking AWS credentials..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
  log "❌ AWS credentials not configured properly. Please run 'aws configure'"
  exit 1
fi
log "✅ AWS credentials valid"

# 3. Run AWS environment validation
log "Running AWS environment validation..."
node scripts/validate-aws-env.js
if [ $? -ne 0 ]; then
  log "⚠️ AWS environment validation found issues. Continuing with fixes..."
else
  log "✅ AWS environment looks good"
fi

# 4. Bootstrap CDK environment
log "Bootstrapping CDK environment..."
npx cdk bootstrap
if [ $? -ne 0 ]; then
  log "❌ CDK bootstrap failed. You may need admin privileges."
  exit 1
fi
log "✅ CDK bootstrap completed"

# 5. Generate fresh CDK output
log "Generating fresh CloudFormation templates..."
npx cdk synth
if [ $? -ne 0 ]; then
  log "❌ CDK synthesis failed. Check your Amplify configuration."
  exit 1
fi
log "✅ CDK synthesis completed"

# 6. Fix VTL template issues
log "Checking for VTL template issues..."
node scripts/fix-vtl-templates.js
log "✅ VTL template check completed"

# 7. Try direct asset sync
log "Attempting direct asset sync..."
bash scripts/direct-fix-assets.sh
log "✅ Direct asset sync completed"

# 8. Try deployment with debug
log "Attempting deployment with enhanced debugging..."
bash scripts/deploy-with-debug.sh
if [ $? -eq 0 ]; then
  log "🎉 Deployment succeeded! Your backend is now ready."
  exit 0
fi
log "⚠️ Debug deployment failed, trying more solutions..."

# 9. Try comprehensive asset fixing
log "Attempting comprehensive asset fixing..."
node scripts/fix-cdk-assets.js
if [ $? -eq 0 ]; then
  log "🎉 Asset fixing succeeded! Your backend should now be deployed."
  exit 0
fi
log "⚠️ Comprehensive asset fixing didn't fully resolve the issue."

# 10. Check CloudFormation stacks for detailed errors
log "Analyzing CloudFormation stacks for detailed errors..."
node scripts/check-cloudformation.js

# 11. Generate recommended IAM policy
log "Generating recommended IAM policy..."
node scripts/generate-iam-policy.js

log "===========================================" 
log "⚠️ All automatic repair attempts completed."
log "If deployment is still failing, please:"
log "1. Check the generated policy in aws-policies/"
log "2. Apply the recommended IAM permissions"
log "3. Review 'CDK_TROUBLESHOOTING.md' for manual solutions"
log "4. Try 'npx cdk deploy --hotswap' for faster deployment"

exit 1
