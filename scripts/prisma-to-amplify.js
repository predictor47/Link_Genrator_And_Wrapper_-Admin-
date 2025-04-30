// Migration script to transfer data from Prisma SQLite database to AWS Amplify
const { PrismaClient } = require('@prisma/client');
const { Amplify } = require('aws-amplify');
const { generateClient } = require('aws-amplify/api');
const fs = require('fs');
const path = require('path');

// Initialize Prisma client for reading from SQLite
const prisma = new PrismaClient();

// Configure Amplify
let amplifyOutputs = null;
const possiblePaths = [
  path.join(process.cwd(), 'amplify_outputs.json'),
  path.join(process.cwd(), '.amplify', 'amplify_outputs.json'),
  path.join(process.cwd(), 'src', 'amplify_outputs.json')
];
      
for (const possiblePath of possiblePaths) {
  if (fs.existsSync(possiblePath)) {
    const outputsContent = fs.readFileSync(possiblePath, 'utf8');
    amplifyOutputs = JSON.parse(outputsContent);
    break;
  }
}

if (!amplifyOutputs) {
  console.error('Could not find amplify_outputs.json. Make sure to run "amplify push" first.');
  console.error('You can also set environment variables for configuration:');
  console.error('NEXT_PUBLIC_API_ENDPOINT, NEXT_PUBLIC_API_REGION, etc.');
  process.exit(1);
}

// Configure Amplify with the settings
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: amplifyOutputs.auth?.userPoolId || process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID,
      userPoolClientId: amplifyOutputs.auth?.userPoolClientId || process.env.NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID,
      identityPoolId: amplifyOutputs.auth?.identityPoolId || process.env.NEXT_PUBLIC_AUTH_IDENTITY_POOL_ID,
    }
  },
  API: {
    GraphQL: {
      endpoint: amplifyOutputs.api?.endpoint || process.env.NEXT_PUBLIC_API_ENDPOINT,
      region: amplifyOutputs.api?.region || process.env.NEXT_PUBLIC_API_REGION || 'us-east-1',
      defaultAuthMode: 'apiKey',
      apiKey: amplifyOutputs.api?.apiKey || process.env.NEXT_PUBLIC_API_KEY,
    }
  }
});

// Generate Amplify API client
const client = generateClient();

async function migrateProjects() {
  console.log('Migrating projects...');
  const projects = await prisma.project.findMany();
  
  for (const project of projects) {
    try {
      // Create project in Amplify
      const result = await client.models.Project.create({
        id: project.id, // Keep the same ID
        name: project.name,
        description: project.description,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt?.toISOString() || project.createdAt.toISOString()
      });
      console.log(`Migrated project: ${project.name} (${project.id})`);
    } catch (error) {
      console.error(`Error migrating project ${project.id}:`, error);
    }
  }
}

async function migrateVendors() {
  console.log('Migrating vendors...');
  const vendors = await prisma.vendor.findMany();
  
  for (const vendor of vendors) {
    try {
      // Create vendor in Amplify
      await client.models.Vendor.create({
        id: vendor.id,
        name: vendor.name,
        code: vendor.code,
        projectId: vendor.projectId,
        createdAt: vendor.createdAt.toISOString(),
        updatedAt: vendor.updatedAt?.toISOString() || vendor.createdAt.toISOString()
      });
      console.log(`Migrated vendor: ${vendor.name} (${vendor.id})`);
    } catch (error) {
      console.error(`Error migrating vendor ${vendor.id}:`, error);
    }
  }
}

async function migrateQuestions() {
  console.log('Migrating questions...');
  const questions = await prisma.question.findMany();
  
  for (const question of questions) {
    try {
      // Create question in Amplify
      await client.models.Question.create({
        id: question.id,
        projectId: question.projectId,
        text: question.text,
        options: question.options,
        createdAt: question.createdAt.toISOString()
      });
      console.log(`Migrated question: ${question.text.substring(0, 30)}... (${question.id})`);
    } catch (error) {
      console.error(`Error migrating question ${question.id}:`, error);
    }
  }
}

async function migrateSurveyLinks() {
  console.log('Migrating survey links...');
  const surveyLinks = await prisma.surveyLink.findMany();
  
  for (const link of surveyLinks) {
    try {
      // Create survey link in Amplify
      await client.models.SurveyLink.create({
        id: link.id,
        uid: link.uid,
        projectId: link.projectId,
        originalUrl: link.originalUrl,
        vendorId: link.vendorId,
        status: link.status,
        linkType: link.linkType,
        geoRestriction: link.geoRestriction,
        createdAt: link.createdAt.toISOString(),
        updatedAt: link.updatedAt?.toISOString() || link.createdAt.toISOString()
      });
      console.log(`Migrated survey link: ${link.uid} (${link.id})`);
    } catch (error) {
      console.error(`Error migrating survey link ${link.id}:`, error);
    }
  }
}

async function migrateResponses() {
  console.log('Migrating responses...');
  const responses = await prisma.response.findMany();
  
  for (const response of responses) {
    try {
      // Create response in Amplify
      await client.models.Response.create({
        id: response.id,
        surveyLinkId: response.surveyLinkId,
        projectId: response.projectId,
        questionId: response.questionId,
        answer: response.answer,
        metadata: response.metadata,
        createdAt: response.createdAt.toISOString()
      });
      console.log(`Migrated response: ${response.id}`);
    } catch (error) {
      console.error(`Error migrating response ${response.id}:`, error);
    }
  }
}

async function migrateFlags() {
  console.log('Migrating flags...');
  const flags = await prisma.flag.findMany();
  
  for (const flag of flags) {
    try {
      // Create flag in Amplify
      await client.models.Flag.create({
        id: flag.id,
        surveyLinkId: flag.surveyLinkId,
        projectId: flag.projectId,
        reason: flag.reason,
        metadata: flag.metadata,
        resolved: flag.resolved || false,
        createdAt: flag.createdAt.toISOString()
      });
      console.log(`Migrated flag: ${flag.id}`);
    } catch (error) {
      console.error(`Error migrating flag ${flag.id}:`, error);
    }
  }
}

async function main() {
  console.log('Starting Prisma to Amplify data migration...');
  
  try {
    // Migrate in the right order to respect relationships
    await migrateProjects();
    await migrateVendors();
    await migrateQuestions();
    await migrateSurveyLinks();
    await migrateResponses();
    await migrateFlags();
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();