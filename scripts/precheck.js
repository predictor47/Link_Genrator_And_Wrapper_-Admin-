/**
 * Pre-deployment check script
 * Validates that all required files and configurations are in place
 * for a successful AWS Amplify deployment
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define critical files and directories
const criticalPaths = [
  'amplify/backend.ts',
  'amplify/auth/resource.ts',
  'amplify/data/resource.ts',
  'amplify.yml',
  'cdk.json',
  '.env',
  'src/lib/amplify-data-service.ts',
  'src/lib/amplify-config.ts',
  'src/lib/auth-service.ts',
];

// Define required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_DOMAIN',
  'NEXT_PUBLIC_ADMIN_DOMAIN',
];

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

console.log(`${colors.bright}AWS Amplify Deployment Pre-check${colors.reset}\n`);

// Check that critical files/directories exist
console.log(`${colors.bright}Checking required files...${colors.reset}`);
let missingFiles = false;
for (const pathToCheck of criticalPaths) {
  const fullPath = path.join(process.cwd(), pathToCheck);
  if (fs.existsSync(fullPath)) {
    console.log(`${colors.green}✓${colors.reset} ${pathToCheck}`);
  } else {
    console.log(`${colors.red}✗${colors.reset} ${pathToCheck} - MISSING`);
    missingFiles = true;
  }
}

// Check for Prisma remnants
console.log(`\n${colors.bright}Checking for Prisma remnants...${colors.reset}`);
const prismaRemnants = [
  'prisma',
  'src/lib/prisma.ts',
];
let hasPrismaRemnants = false;
for (const remnant of prismaRemnants) {
  const fullPath = path.join(process.cwd(), remnant);
  if (fs.existsSync(fullPath)) {
    console.log(`${colors.red}✗${colors.reset} ${remnant} - FOUND (needs to be removed)`);
    hasPrismaRemnants = true;
  } else {
    console.log(`${colors.green}✓${colors.reset} ${remnant} - Not found (good)`);
  }
}

// Check environment variables
console.log(`\n${colors.bright}Checking environment variables...${colors.reset}`);
let missingEnvVars = false;
for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    console.log(`${colors.green}✓${colors.reset} ${envVar}`);
  } else {
    console.log(`${colors.yellow}!${colors.reset} ${envVar} - not set`);
    missingEnvVars = true;
  }
}

// Check package.json for Prisma dependencies
console.log(`\n${colors.bright}Checking package.json for Prisma dependencies...${colors.reset}`);
const packageJsonPath = path.join(process.cwd(), 'package.json');
let hasPrismaInPackageJson = false;
if (fs.existsSync(packageJsonPath)) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { 
      ...packageJson.dependencies, 
      ...packageJson.devDependencies 
    };
    
    const prismaKeys = Object.keys(dependencies || {}).filter(key => 
      key.includes('prisma') || key === '@prisma/client'
    );
    
    if (prismaKeys.length > 0) {
      console.log(`${colors.red}✗${colors.reset} Found Prisma dependencies: ${prismaKeys.join(', ')}`);
      hasPrismaInPackageJson = true;
    } else {
      console.log(`${colors.green}✓${colors.reset} No Prisma dependencies found in package.json`);
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Error reading package.json: ${error.message}`);
  }
} else {
  console.log(`${colors.red}✗${colors.reset} package.json not found`);
}

// Summary
console.log(`\n${colors.bright}Summary:${colors.reset}`);
if (missingFiles) {
  console.log(`${colors.red}✗${colors.reset} Missing critical files`);
} else {
  console.log(`${colors.green}✓${colors.reset} All critical files present`);
}

if (hasPrismaRemnants) {
  console.log(`${colors.red}✗${colors.reset} Prisma remnants found`);
} else {
  console.log(`${colors.green}✓${colors.reset} No Prisma remnants found`);
}

if (missingEnvVars) {
  console.log(`${colors.yellow}!${colors.reset} Some environment variables not set`);
} else {
  console.log(`${colors.green}✓${colors.reset} All environment variables set`);
}

if (hasPrismaInPackageJson) {
  console.log(`${colors.red}✗${colors.reset} Prisma dependencies found in package.json`);
} else {
  console.log(`${colors.green}✓${colors.reset} No Prisma dependencies in package.json`);
}

// Final assessment
if (!missingFiles && !hasPrismaRemnants && !hasPrismaInPackageJson) {
  console.log(`\n${colors.green}${colors.bright}✓ PASS: Your project is ready for AWS Amplify deployment!${colors.reset}`);
  process.exit(0);
} else {
  console.log(`\n${colors.red}${colors.bright}✗ FAIL: Please fix the issues above before deployment.${colors.reset}`);
  process.exit(1);
}
