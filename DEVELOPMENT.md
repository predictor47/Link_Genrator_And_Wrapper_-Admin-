# Development and Maintenance Guide

This document serves as a guide for ongoing development and maintenance of the Survey Link Wrapper application using AWS Amplify Gen 2.

## Project Structure

- `amplify/` - Contains Amplify backend configuration
  - `auth/` - Cognito authentication setup
  - `data/` - GraphQL API and data models
  - `backend.ts` - Main backend definition file
- `src/` - Frontend and API routes
  - `lib/` - Shared utilities and services
  - `pages/` - Next.js pages and API routes
  - `components/` - React components
- `scripts/` - Utility scripts for setup and deployment

## Key Services

### 1. Amplify Data Service (`src/lib/amplify-data-service.ts`)

This is the main service for interacting with the DynamoDB backend. It provides methods for:
- Creating, reading, updating, and deleting data
- Managing relationships between models
- Handling complex queries

The service exposes the following namespaces:
- `projects`
- `surveyLinks`
- `vendors`
- `questions`
- `responses`
- `flags`

### 2. Auth Service (`src/lib/auth-service.ts`)

Handles authentication with AWS Cognito, including:
- User signup and login
- Password reset
- User attribute management
- Session management

### 3. Amplify Configuration (`src/lib/amplify-config.ts`)

Configures the Amplify library with the correct settings for:
- API endpoints
- Authentication
- Storage
- Domain configuration

## Data Models

All data models are defined in `amplify/data/resource.ts`:

1. **Project**
   - Central entity containing survey projects
   - Has many vendors, survey links, questions, etc.

2. **SurveyLink**
   - Represents individual survey links
   - Contains status, URL, and other link information

3. **Vendor**
   - Tracks different vendors/sources
   - Allows grouping survey links by vendor

4. **Question**
   - Stores survey questions
   - Contains question text and options (as JSON)

5. **Response**
   - Stores user responses to questions
   - Links back to survey links and questions

6. **Flag**
   - Represents issues or flags on survey links
   - Used for quality control

## Development Workflow

### Adding a New Feature

1. Define data model changes in `amplify/data/resource.ts` if needed
2. Update the `amplify-data-service.ts` with new methods
3. Create or update API endpoints in `src/pages/api/`
4. Update frontend components and pages
5. Test locally using `npm run dev`
6. Deploy using `npm run deploy`

### Modifying Data Models

1. Update the schema in `amplify/data/resource.ts`
2. Run `npx ampx gen` to generate updated TypeScript types
3. Deploy backend changes: `npx ampx pipeline-deploy`

### Adding Authentication Features

1. Modify `amplify/auth/resource.ts`
2. Update `src/lib/auth-service.ts` as needed
3. Deploy changes: `npx ampx pipeline-deploy`

## Deployment Process

1. **Development**: Use `npm run deploy` for sandbox deployment
2. **Testing**: Run `npm run precheck` to verify configuration
3. **Production**: Use `npm run deploy:prod` for full deployment

## Monitoring and Maintenance

### CloudWatch Logs

- API logs: Check CloudWatch Logs for AppSync API
- Authentication logs: Check Cognito CloudWatch Logs
- General errors: Check Amplify Console logs

### Database Management

- Use AWS DynamoDB console to view and manage data
- Create backups regularly via AWS Console

## Common Issues and Solutions

### API Errors

- Check environment variables
- Verify API key hasn't expired
- Check CloudWatch logs for detailed error messages

### Authentication Issues

- Verify Cognito User Pool configuration
- Check callback URLs in `amplify/auth/resource.ts`
- Ensure environment variables are set correctly

### Deployment Failures

- Run `npm run precheck` to verify configuration
- Check AWS IAM permissions
- Verify CDK bootstrap has completed successfully

## Adding New Environments

1. Update `cdk.json` with new environment name
2. Create a new branch in your repo
3. Configure environment variables for the new environment
4. Deploy to the new environment

## Resources

- [AWS Amplify Gen 2 Documentation](https://docs.amplify.aws/)
- [Next.js Documentation](https://nextjs.org/docs)
- [AWS AppSync Documentation](https://docs.aws.amazon.com/appsync/)
