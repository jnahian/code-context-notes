#!/usr/bin/env node

/**
 * Code Context Notes - Publishing Script
 * Publishes to both VSCode Marketplace and Open VSX Registry
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    log(`❌ Command failed: ${command}`, 'red');
    process.exit(1);
  }
}

async function main() {
  log('🚀 Publishing Code Context Notes Extension', 'blue');
  log('==========================================', 'blue');

  // Load environment variables
  // .env lives at the monorepo root, but this script runs from packages/extension
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const envPath = path.join(repoRoot, '.env');
  if (!fs.existsSync(envPath)) {
    log(`Error: .env file not found at ${envPath}`, 'red');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    }
  });

  const { VSCE_PAT, OVSX_PAT } = envVars;

  if (!VSCE_PAT) {
    log('Error: VSCE_PAT not found in .env', 'red');
    process.exit(1);
  }

  if (!OVSX_PAT) {
    log('Error: OVSX_PAT not found in .env', 'red');
    process.exit(1);
  }

  // Get extension details
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const { name, publisher, version, displayName } = packageJson;

  log(`Extension: ${displayName}`, 'yellow');
  log(`Publisher: ${publisher}`, 'yellow');
  log(`Version: ${version}`, 'yellow');
  console.log();

  // Step 1: Build
  log('📦 Step 1: Building extension...', 'blue');
  exec('npm run compile');
  log('✅ Build successful', 'green');
  console.log();

  // Step 2: Test
  log('🧪 Step 2: Running tests...', 'blue');
  exec('npm run test:unit');
  log('✅ Tests passed', 'green');
  console.log();

  // Step 3: Package
  log('📦 Step 3: Packaging extension...', 'blue');
  // --no-dependencies: the esbuild bundle is self-contained, and vsce's default
  // `npm ls --production` dependency walk breaks on the monorepo workspace
  // symlink (@jnahian/code-notes-core), reporting a missing entrypoint.
  exec('vsce package --no-git-tag-version --no-dependencies');
  const packageFile = `${name}-${version}.vsix`;
  log(`✅ Package created: ${packageFile}`, 'green');
  console.log();

  // Step 4: Install ovsx if needed
  log('🔧 Step 4: Checking ovsx CLI...', 'blue');
  try {
    execSync('ovsx --version', { stdio: 'ignore' });
  } catch {
    log('Installing ovsx CLI...', 'yellow');
    exec('npm install -g ovsx');
  }
  log('✅ ovsx CLI ready', 'green');
  console.log();

  // Step 5: Publish to VSCode Marketplace
  log('🏪 Step 5: Publishing to VSCode Marketplace...', 'blue');
  exec(`vsce publish --no-dependencies --pat "${VSCE_PAT}"`);
  log('✅ Published to VSCode Marketplace', 'green');
  const vscodeUrl = `https://marketplace.visualstudio.com/items?itemName=${publisher}.${name}`;
  log(`📍 VSCode Marketplace URL: ${vscodeUrl}`, 'green');
  console.log();

  // Step 6: Publish to Open VSX Registry
  log('🌐 Step 6: Publishing to Open VSX Registry...', 'blue');
  exec(`ovsx publish "${packageFile}" --pat "${OVSX_PAT}"`);
  log('✅ Published to Open VSX Registry', 'green');
  const openvsxUrl = `https://open-vsx.org/extension/${publisher}/${name}`;
  log(`📍 Open VSX URL: ${openvsxUrl}`, 'green');
  console.log();

  // Success summary
  log('🎉 PUBLICATION SUCCESSFUL! 🎉', 'green');
  log('=========================', 'green');
  log(`Extension: ${displayName} v${version}`, 'green');
  console.log();
  log('📍 VSCode Marketplace:', 'green');
  log(`   ${vscodeUrl}`, 'blue');
  console.log();
  log('📍 Open VSX Registry:', 'green');
  log(`   ${openvsxUrl}`, 'blue');
  console.log();
  log(`📦 Package file: ${packageFile}`, 'green');
  console.log();
  log('Next steps:', 'yellow');
  console.log('1. Verify extensions appear in both marketplaces');
  console.log('2. Test installation from both sources');
  console.log('3. Create GitHub release with changelog');
  console.log('4. Announce on social media');
  console.log();
  log('Happy coding! 🚀', 'green');
}

main().catch(error => {
  log(`❌ Publication failed: ${error.message}`, 'red');
  process.exit(1);
});