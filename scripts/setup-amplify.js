/**
 * AWS Amplify Gen 2 Setup Script
 * 
 * This script sets up AWS Amplify Gen 2 for your project and helps migrate
 * from local Prisma/SQLite to a fully cloud-based Amplify backend.
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { spawn } = require('child_process');

// Define paths
const rootDir = path.resolve(__dirname, '..');
const amplifyDataPath = path.join(rootDir, 'amplify', 'data', 'resource.ts');
const amplifyConfigPath = path.join(rootDir, 'src', 'lib', 'amplify-config.ts');
const amplifyDataServicePath = path.join(rootDir, 'src', 'lib', 'amplify-data-service.ts');

/**
 * Check if Amplify Gen 2 is installed
 */
async function checkAmplifyGen2() {
  try {
    const { stdout } = await exec('npx @aws-amplify/backend-cli --version');
    console.log('✅ Amplify Gen 2 CLI is available:', stdout.trim());
    return true;
  } catch (error) {
    console.log('❌ Amplify Gen 2 CLI is not installed');
    
    try {
      console.log('🔄 Installing Amplify Gen 2 CLI...');
      await exec('npm install --save-dev @aws-amplify/backend-cli');
      console.log('✅ Amplify Gen 2 CLI installed successfully');
      return true;
    } catch (installError) {
      console.error('❌ Failed to install Amplify Gen 2 CLI:', installError.message);
      return false;
    }
  }
}

/**
 * Check if required files exist
 */
async function checkRequiredFiles() {
  console.log('🔍 Checking required files...');
  
  let allFilesExist = true;
  const requiredFiles = [
    amplifyDataPath,
    amplifyConfigPath,
    amplifyDataServicePath
  ];
  
  for (const file of requiredFiles) {
    try {
      await fs.promises.access(file);
      console.log(`  ✅ Found: ${path.relative(rootDir, file)}`);
    } catch (error) {
      console.log(`  ❌ Missing: ${path.relative(rootDir, file)}`);
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

/**
 * Configure VS Code for AWS development
 */
async function configureVSCode() {
  try {
    console.log('🔄 Configuring VS Code for AWS development...');
    const vscodeDir = path.join(rootDir, '.vscode');
    
    // Create .vscode directory if it doesn't exist
    if (!fs.existsSync(vscodeDir)) {
      await fs.promises.mkdir(vscodeDir);
    }
    
    // Create or update settings.json
    const settingsPath = path.join(vscodeDir, 'settings.json');
    let settings = {};
    
    if (fs.existsSync(settingsPath)) {
      try {
        const content = await fs.promises.readFile(settingsPath, 'utf8');
        settings = JSON.parse(content);
      } catch (error) {
        console.warn('⚠️ Could not parse existing settings.json, creating new one');
      }
    }
    
    // Update settings for AWS/Amplify development
    settings['aws.telemetry'] = true;
    settings['javascript.updateImportsOnFileMove.enabled'] = 'always';
    settings['typescript.updateImportsOnFileMove.enabled'] = 'always';
    settings['editor.codeActionsOnSave'] = {
      ...(settings['editor.codeActionsOnSave'] || {}),
      'source.fixAll.eslint': true
    };
    
    await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    console.log('✅ VS Code settings updated');
    
    // Create or update extensions.json
    const extensionsPath = path.join(vscodeDir, 'extensions.json');
    let extensions = { recommendations: [] };
    
    if (fs.existsSync(extensionsPath)) {
      try {
        const content = await fs.promises.readFile(extensionsPath, 'utf8');
        extensions = JSON.parse(content);
      } catch (error) {
        console.warn('⚠️ Could not parse existing extensions.json, creating new one');
      }
    }
    
    // AWS extension recommendations
    const awsExtensions = [
      'amazonwebservices.aws-toolkit-vscode',
      'dbaeumer.vscode-eslint',
      'esbenp.prettier-vscode'
    ];
    
    // Merge with existing recommendations
    extensions.recommendations = [...new Set([
      ...(extensions.recommendations || []),
      ...awsExtensions
    ])];
    
    await fs.promises.writeFile(extensionsPath, JSON.stringify(extensions, null, 2));
    console.log('✅ VS Code extension recommendations updated');
    
    // Create or update launch.json
    const launchPath = path.join(vscodeDir, 'launch.json');
    let launchConfig = {
      version: '0.2.0',
      configurations: []
    };
    
    if (fs.existsSync(launchPath)) {
      try {
        const content = await fs.promises.readFile(launchPath, 'utf8');
        launchConfig = JSON.parse(content);
      } catch (error) {
        console.warn('⚠️ Could not parse existing launch.json, creating new one');
      }
    }
    
    // Add configurations for Amplify and Next.js
    const newConfigs = [
      {
        type: 'node',
        request: 'launch',
        name: 'Amplify Gen 2 Sandbox',
        runtimeExecutable: 'npx',
        runtimeArgs: ['@aws-amplify/backend-cli', 'sandbox'],
        console: 'integratedTerminal'
      },
      {
        type: 'node',
        request: 'launch',
        name: 'Next.js Dev Server',
        runtimeExecutable: 'npm',
        runtimeArgs: ['run', 'dev'],
        console: 'integratedTerminal'
      }
    ];
    
    // Only add configurations if they don't already exist
    const existingNames = (launchConfig.configurations || []).map(c => c.name);
    
    for (const config of newConfigs) {
      if (!existingNames.includes(config.name)) {
        launchConfig.configurations = [...(launchConfig.configurations || []), config];
      }
    }
    
    await fs.promises.writeFile(launchPath, JSON.stringify(launchConfig, null, 2));
    console.log('✅ VS Code launch configurations updated');
    
    return true;
  } catch (error) {
    console.error('❌ Error configuring VS Code:', error.message);
    return false;
  }
}

/**
 * Run the Amplify Gen 2 sandbox to test the configuration
 */
function runAmplifySandbox() {
  console.log('🔄 Starting Amplify Gen 2 sandbox to test configuration...');
  console.log('📋 Press Ctrl+C to stop the sandbox when you\'re done testing.');
  
  return new Promise((resolve) => {
    const amplifySandbox = spawn('npx', ['@aws-amplify/backend-cli', 'sandbox'], {
      stdio: 'inherit',
      shell: true
    });
    
    amplifySandbox.on('close', (code) => {
      if (code === 0 || code === null) {
        console.log('✅ Amplify Gen 2 sandbox test completed successfully');
      } else {
        console.warn(`⚠️ Amplify Gen 2 sandbox exited with code ${code}`);
      }
      resolve();
    });
    
    // Allow the user to stop the sandbox with a key press
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.on('data', (data) => {
      // Ctrl+C
      if (data.toString() === '\u0003') {
        amplifySandbox.kill();
        process.stdin.setRawMode?.(false);
        resolve();
      }
    });
  });
}

/**
 * Main setup function
 */
async function setup() {
  console.log('🚀 Setting up AWS Amplify Gen 2 for your project...\n');
  
  // Check if Amplify Gen 2 is installed
  const amplifyInstalled = await checkAmplifyGen2();
  if (!amplifyInstalled) {
    console.error('❌ Cannot continue without Amplify Gen 2 CLI');
    process.exit(1);
  }
  
  // Check required files
  const filesExist = await checkRequiredFiles();
  if (!filesExist) {
    console.error('❌ Some required files are missing. Please check the errors above.');
    process.exit(1);
  }
  
  // Configure VS Code
  await configureVSCode();
  
  console.log('\n✅ AWS Amplify Gen 2 setup complete!');
  console.log('\n📋 Next steps:');
  console.log('  1. Install the recommended VS Code extensions');
  console.log('  2. Update your .env.local file with AWS credentials');
  console.log('  3. Run `npx @aws-amplify/backend-cli sandbox` to start a development environment');
  console.log('  4. Run `npm run dev` to start your Next.js application');
  
  // Ask if the user wants to test the configuration
  console.log('\n❓ Would you like to start the Amplify Gen 2 sandbox to test your configuration? (y/N)');
  
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.once('data', async (input) => {
    if (input.toString().trim().toLowerCase() === 'y') {
      await runAmplifySandbox();
    }
    
    console.log('\n👋 Setup complete! Happy coding!');
    process.exit(0);
  });
}

// Run the setup function
setup();