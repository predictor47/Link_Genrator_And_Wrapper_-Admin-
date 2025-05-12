# Survey Link Wrapper & Admin Tool

A comprehensive tool for generating, managing, and analyzing survey links with AWS Amplify Gen 2 backend.

## Architecture

This application uses AWS Amplify Gen 2 with the following components:

- **Backend:** AWS AppSync GraphQL API with DynamoDB
- **Authentication:** Amazon Cognito User Pools
- **Frontend:** Next.js with React

## Prerequisites

- Node.js v22+ and npm
- AWS CLI installed and configured (`aws configure`)
- An AWS account with permissions to create Amplify resources
- AWS Amplify CLI v6+ (`npm install -g @aws-amplify/cli`)

## Getting Started

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

4. Set up Amplify backend:
   ```bash
   npm run setup-amplify
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment

### Testing before deployment

Run the precheck script to ensure everything is ready:
```bash
npm run precheck
```

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

- **Deployment Issues**: Run the precheck script first
- **Auth Issues**: Check Cognito configuration
- **API Issues**: Verify that environment variables are set correctly

## License

Proprietary - All rights reserved
