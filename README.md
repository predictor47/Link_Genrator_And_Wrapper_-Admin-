# Survey Link Wrapper & Admin Tool

A comprehensive tool for generating, managing, and analyzing survey links with AWS Amplify Gen 2 backend.

## Architecture

This application uses AWS Amplify Gen 2 with the following components:

- **Backend:** AWS AppSync GraphQL API with DynamoDB
- **Authentication:** Amazon Cognito User Pools
- **Frontend:** Next.js with React

## Prerequisites

- Node.js v22+ and npm
- GitHub repository connected to AWS Amplify app
- AWS account with Amplify service access

## Getting Started

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env.local` and fill in the values
   - Required variables:
     - `NEXT_PUBLIC_DOMAIN`
     - `NEXT_PUBLIC_ADMIN_DOMAIN`
     - `NEXT_PUBLIC_APP_URL`

4. Run the development server:
   ```bash
   npm run dev
   ```

### Deployment

## Project Structure

- `amplify/` - AWS Amplify Gen 2 backend configuration
  - `auth/` - Authentication configuration
  - `data/` - GraphQL schema and data models
- `src/`
  - `components/` - Reusable React components
  - `lib/` - Utility functions and services
  - `pages/` - Next.js pages
    - `admin/` - Admin dashboard
    - `api/` - API routes
    - `survey/` - Survey pages
  - `styles/` - CSS styles
  - `types/` - TypeScript type definitions

### Option 1: Deploy to Amplify Sandbox (for testing)

```bash
npm run deploy
```

### Option 2: Production Deployment

```bash
npm run deploy:prod
```

This script:
1. Ensures Amplify packages are installed
2. Configures Amplify
3. Deploys the backend
4. Builds and deploys the frontend

### Post-deployment Steps

1. Verify API connection:
```bash
API_KEY=your-api-key npm run test-graphql
```

2. Create an admin user:
```bash
USER_EMAIL=admin@example.com TEMP_PASSWORD=YourSecurePassword123! npm run create-test-user
```

3. Update environment variables in the Amplify console or in your `.env.local` file with the values from `amplify_outputs.json`

4. Build and deploy the frontend:
```bash
npm run build
```

## Custom Domains

In the Amplify Console:
1. Go to your app settings
2. Navigate to "Domain Management"
3. Add the custom domains:
   - Main domain: `protegeresearchsurvey.com`
   - Admin subdomain: `admin.protegeresearchsurvey.com`

## API Endpoints

The API endpoints are located in `src/pages/api/` and include:

- `/api/vendors/*` - Vendor management
- `/api/projects/*` - Project management
- `/api/links/*` - Survey link management

## Authentication

Authentication is handled through AWS Cognito with the following features:
- Email-based login
- Multi-factor authentication (optional)
- Password recovery
- Role-based access control

## Testing

Run the API test script:
```bash
npm run test-api
```

## Troubleshooting

### General Issues
- **Deployment Issues**: Run the precheck script first: `npm run precheck`
- **Auth Issues**: Check Cognito configuration in `amplify/auth/resource.ts`
- **API Issues**: Verify that environment variables are set correctly

### CDK Asset Publishing Errors

If you encounter CDK asset publishing errors during deployment, use our troubleshooting tools:

1. **Validate AWS Environment**:
   ```bash
   npm run check-aws
   ```
   This checks your AWS credentials, region settings, and CDK bootstrap status.

2. **Fix VTL Template Issues**:
   ```bash
   npm run fix-vtl
   ```
   This scans and fixes common VTL template issues in your Amplify project.

3. **Check CloudFormation Stack Status**:
   ```bash
   npm run check-stacks
   ```
   This analyzes any failed CloudFormation stacks and provides detailed error information.

4. **Generate Required IAM Policy**:
   ```bash
   npm run generate-policy
   ```
   Creates and applies the necessary IAM policy for Amplify Gen 2 deployment.

5. **Quick Fix for Asset Publishing Errors**:
   ```bash
   npm run direct-fix
   ```
   This script directly uploads assets to the S3 bucket, fixing the most common CDK asset publishing error.

6. **Advanced Asset Publishing Fix**:
   ```bash
   npm run fix-assets
   ```
   A comprehensive solution that tries multiple approaches to fix asset publishing issues.

7. **Complete Automated Repair**:
   ```bash
   npm run repair-all
   ```
   This comprehensive script runs all repair steps in sequence to fix any deployment issues.

8. **Force Deployment**:
   ```bash
   AMPLIFY_DEBUG=true npx ampx deploy --force
   ```
   Use this command to deploy with debug logging enabled.

For more detailed troubleshooting information, see:
- [CDK_TROUBLESHOOTING.md](./CDK_TROUBLESHOOTING.md) - Details on fixing CDK asset publishing errors
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment workflow documentation

## License

Proprietary - All rights reserved
