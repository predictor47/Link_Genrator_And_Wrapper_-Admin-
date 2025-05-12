# Troubleshooting Guide for AWS Amplify Gen 2 Deployment

This guide covers common issues you might encounter when deploying and running the Survey Link Wrapper application with AWS Amplify Gen 2.

## API Authentication Issues

### Issue: "Not Authorized to access X on type Query" errors

**Possible causes:**
- API key is missing or invalid
- API key has expired (default is 30 days)
- Using wrong authorization mode for the query

**Solution:**
1. Check if the API key in `.env.local` matches the one in `amplify_outputs.json`
2. Verify the API key hasn't expired by running:
   ```bash
   API_KEY=your-api-key npm run test-graphql
   ```
3. Ensure the `amplify-data-service.ts` is using the correct authMode:
   ```typescript
   const client = generateClient<Schema>({
     authMode: 'apiKey'
   });
   ```

### Issue: "User is not authenticated" errors

**Possible causes:**
- User not signed in
- Trying to access a protected resource
- JWT token expired

**Solution:**
1. Ensure user is properly signed in through Cognito
2. Check if the user has the required permissions
3. Try signing out and signing back in
4. Check console for auth-related errors

## Deployment Issues

### Issue: "CDK is not bootstrapped" error

**Solution:**
```bash
npx cdk bootstrap aws://YOUR_AWS_ACCOUNT_ID/YOUR_AWS_REGION
```

### Issue: "Resource already exists" error

**Solution:**
1. Check the AWS CloudFormation console for failed deployments
2. Delete the stack or the specific resource causing conflicts
3. Try deploying with a different environment name:
   ```bash
   AMPLIFY_BACKEND_NAME=dev2 npm run deploy
   ```

## Environment Variables

### Issue: Missing or incorrect environment variables

**Solution:**
1. Ensure all required variables are in `.env.local`:
   ```
   NEXT_PUBLIC_AUTH_USER_POOL_ID
   NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID
   NEXT_PUBLIC_AUTH_REGION
   NEXT_PUBLIC_API_ENDPOINT
   NEXT_PUBLIC_AMPLIFY_API_KEY
   ```
2. Copy values from `amplify_outputs.json` if unsure
3. Restart the development server after changes

## Database Issues

### Issue: Data not appearing in queries

**Possible causes:**
- No data exists yet
- Permissions issue
- Index not yet propagated

**Solution:**
1. Create test data using the admin interface
2. Check DynamoDB console to verify data exists
3. Wait a few minutes for indexes to propagate
4. Verify the query syntax is correct

## Common AppSync Errors

- **Missing required fields**: Check your input data for required fields
- **Validation error**: Ensure data meets validation rules
- **Field resolver error**: Check resolver implementation
- **Network error**: Verify endpoint and API key

## Getting More Information

For detailed error information:

1. Check browser console logs
2. Look at AWS CloudWatch logs
3. Enable verbose logging in Amplify:
   ```javascript
   Amplify.Logger.LOG_LEVEL = 'DEBUG';
   ```

## Still Having Issues?

Run the validation scripts to collect information:

```bash
npm run validate-api
npm run precheck
```

This will provide details about your configuration that can help diagnose issues.
