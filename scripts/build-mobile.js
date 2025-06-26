
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building mobile app...');

try {
  // Build the web app
  console.log('📦 Building web app...');
  execSync('npm run build', { stdio: 'inherit' });

  // Initialize Capacitor if not already done
  if (!fs.existsSync('capacitor.config.ts')) {
    console.log('🔧 Initializing Capacitor...');
    execSync('npx cap init', { stdio: 'inherit' });
  }

  // Add platforms if they don't exist
  if (!fs.existsSync('ios')) {
    console.log('📱 Adding iOS platform...');
    execSync('npx cap add ios', { stdio: 'inherit' });
  }

  if (!fs.existsSync('android')) {
    console.log('🤖 Adding Android platform...');
    execSync('npx cap add android', { stdio: 'inherit' });
  }

  // Sync the project
  console.log('🔄 Syncing Capacitor...');
  execSync('npx cap sync', { stdio: 'inherit' });

  console.log('✅ Mobile build complete!');
  console.log('');
  console.log('Next steps:');
  console.log('- Run `npx cap run ios` to test on iOS');
  console.log('- Run `npx cap run android` to test on Android');
  console.log('- Run `npx cap open ios` to open in Xcode');
  console.log('- Run `npx cap open android` to open in Android Studio');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
