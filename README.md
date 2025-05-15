# Mass Survey Link Wrapper Tool - AWS Amplify Gen 2

A comprehensive tool for generating, managing, and analyzing survey links with AWS Amplify Gen 2 backend. This tool helps detect bots, track survey completions through iframe domain monitoring, and collect detailed metadata.

## Features

- Custom CAPTCHA verification (JS-only solution, no paid services)
- Behavior tracking for bot detection (mouse movements, keyboard events, etc.)
- Trap questions to verify human respondents
- Iframe domain monitoring for survey completion detection
- Metadata collection (IP, browser, device, timing, etc.)
- VPN/Proxy detection
- Survey outcome tracking (completed, quota full, disqualified)

## Architecture

This application uses AWS Amplify Gen 2 with the following components:

- **Backend:** AWS AppSync GraphQL API with DynamoDB
- **Authentication:** Amazon Cognito User Pools (for admin access only)
- **Frontend:** Next.js with React
- **Security:** Custom bot detection, CAPTCHA, and metadata collection

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
    - `BehaviorTracker.tsx` - Tracks user behavior for bot detection
    - `CustomCaptcha.tsx` - JS-only CAPTCHA solution with multiple difficulty levels
    - `IframeMonitor.tsx` - Monitors iframe domain changes to detect survey completion
    - `SurveyFlow.tsx` - Manages the complete survey flow
    - `TrapQuestion.tsx` - Presents trap questions to verify human respondents
  - `lib/` - Utility functions and services
    - `metadata.ts` - Utilities for collecting user metadata
    - `security-service.ts` - Security-related utilities
    - `use-domain.ts` - Domain monitoring and utilities
    - `vpn-detection.ts` - VPN and proxy detection
  - `pages/` - Next.js pages
    - `admin/` - Admin dashboard
    - `api/` - API routes
      - `links/` - Survey link management API endpoints
      - `verify/` - Verification API endpoints
    - `completion/` - Survey completion handling
    - `s/` - Survey entry points
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

## Testing with Amplify Sandbox

The Amplify Sandbox provides a local development environment that simulates AWS services without deploying to the cloud.

### Setting up the sandbox

```bash
npx ampx sandbox
```

This command:
1. Creates a local DynamoDB instance
2. Sets up local authentication
3. Creates a local AppSync API endpoint

### Testing the Survey Flow

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Access the admin interface (http://localhost:3000/admin)
3. Create a test project with a survey URL
4. Generate test links
5. Open a survey link in a new browser tab or incognito window
6. Complete the CAPTCHA, trap questions, and view the survey
7. To test survey completion, modify the URL to include `/completion/[projectId]/[uid]` which simulates survey completion

### Testing Bot Detection

The application uses multiple layers of bot detection:

1. **Behavioral Analysis:**
   - Open the browser console to see behavior tracking logs
   - Test with unusual mouse movements or rapid keyboard inputs
   - Try copying and pasting text to trigger detection

2. **Verification Challenges:**
   - Test different CAPTCHA difficulty levels
   - Try incorrect answers to trap questions
   - Test mid-survey verification 

3. **Domain Monitoring:**
   - Use browser developer tools to inspect the iframe monitoring
   - Test by manually navigating to completion URLs
   - Verify status updates in the database

## Troubleshooting

### Common Issues

1. **Authentication Issues:**
   - Verify Cognito User Pool is configured correctly
   - Check your local environment variables
   - Run `npx ampx auth rebuild` to reset local authentication

2. **API Errors:**
   - Run `npx ampx status` to check deployment status
   - Verify API key permissions
   - Check GraphQL schema for errors with `npx ampx data validate`

3. **Iframe Not Loading:**
   - Check browser console for CORS errors
   - Verify the survey URL is accessible
   - Test with a simple HTML page as the survey URL

4. **Bot Detection Too Strict:**
   - Adjust sensitivity thresholds in `BehaviorTracker.tsx`
   - Modify CAPTCHA difficulty in the admin settings
   - Check VPN detection settings

### Logs and Debugging

- Server-side logs: Check your terminal running the Next.js server
- Client-side logs: Browser console
- Amplify logs: `npx ampx logs`
- Database inspection: `npx ampx data db:inspect`

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
