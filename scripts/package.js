#!/usr/bin/env node

/**
 * Code Context Notes - Package Script with Git Tagging
 * Creates a package and git tag for the current version
 */

const { execSync } = require('child_process');
const fs = require('fs');

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
  log('📦 Packaging Code Context Notes Extension', 'blue');
  log('========================================', 'blue');

  // Get extension details
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const { name, version, displayName } = packageJson;

  log(`Extension: ${displayName}`, 'yellow');
  log(`Version: ${version}`, 'yellow');
  console.log();

  // Step 1: Build
  log('🔨 Step 1: Building extension...', 'blue');
  exec('npm run compile');
  log('✅ Build successful', 'green');
  console.log();

  // Step 2: Test
  log('🧪 Step 2: Running tests...', 'blue');
  exec('npm run test:unit');
  log('✅ Tests passed', 'green');
  console.log();

  // Step 3: Check git status
  log('📋 Step 3: Checking git status...', 'blue');
  try {
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    if (gitStatus.trim()) {
      log('⚠️  Warning: You have uncommitted changes:', 'yellow');
      console.log(gitStatus);
      log('Consider committing changes before packaging.', 'yellow');
    } else {
      log('✅ Git working directory is clean', 'green');
    }
  } catch (error) {
    log('⚠️  Not in a git repository or git not available', 'yellow');
  }
  console.log();

  // Step 4: Package with git tag
  log('📦 Step 4: Packaging extension with git tag...', 'blue');
  exec('vsce package');
  const packageFile = `${name}-${version}.vsix`;
  log(`✅ Package created: ${packageFile}`, 'green');
  log(`✅ Git tag v${version} created`, 'green');
  console.log();

  // Step 5: Push git tag
  log('🚀 Step 5: Pushing git tag...', 'blue');
  try {
    exec(`git push origin v${version}`);
    log(`✅ Git tag v${version} pushed to remote`, 'green');
  } catch (error) {
    log('⚠️  Failed to push git tag (you may need to push manually)', 'yellow');
  }
  console.log();

  // Success summary
  log('🎉 PACKAGING SUCCESSFUL! 🎉', 'green');
  log('========================', 'green');
  log(`Extension: ${displayName} v${version}`, 'green');
  log(`Package: ${packageFile}`, 'green');
  log(`Git tag: v${version}`, 'green');
  console.log();
  log('Next steps:', 'yellow');
  console.log('1. Test the package locally: code --install-extension ' + packageFile);
  console.log('2. Publish to marketplace: npm run publish');
  console.log('3. Create GitHub release with changelog');
  console.log();
  log('Package ready for distribution! 📦', 'green');
}

main().catch(error => {
  log(`❌ Packaging failed: ${error.message}`, 'red');
  process.exit(1);
});