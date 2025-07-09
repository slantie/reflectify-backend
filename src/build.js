/**
 * @file src/build.js
 * @description Comprehensive build script for the Node.js/TypeScript/Prisma backend application.
 * Automates Prisma client generation, database migration application, and TypeScript compilation.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting backend build process...');

// --- 1. Clean previous build artifacts ---
console.log('\n1. Cleaning previous build artifacts...');
try {
  const distPath = path.resolve(__dirname, '..', 'dist');
  if (fs.existsSync(distPath)) {
    let deleteCommand;
    // Determine the correct delete command based on the operating system.
    if (process.platform === 'win32') {
      deleteCommand = `powershell.exe -Command "Remove-Item -Recurse -Force '${distPath}'"`;
    } else {
      deleteCommand = `rm -rf "${distPath}"`;
    }
    execSync(deleteCommand, { stdio: 'inherit' });
    console.log('Previous "dist" folder removed.');
  } else {
    console.log('No "dist" folder found to clean.');
  }
} catch (error) {
  console.error('Error cleaning build artifacts:', error.message);
  process.exit(1);
}

// --- 2. Generate Prisma Client ---
console.log('\n2. Generating Prisma Client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('Prisma Client generated successfully.');
} catch (error) {
  console.error('Error generating Prisma Client:', error.message);
  process.exit(1);
}

// --- 3. Apply Prisma Migrations (for production/deployment) ---
// console.log('\n3. Applying Prisma Migrations...');
// try {
//   execSync('npx prisma migrate deploy', { stdio: 'inherit' });
//   console.log('Prisma migrations applied successfully.');
// } catch (error) {
//   console.error('Error applying Prisma migrations:', error.message);
//   process.exit(1); // Exit if migrations fail
// }

// --- 4. Compile TypeScript code ---
console.log('\n3. Compiling TypeScript code...');
try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('TypeScript compilation successful.');
} catch (error) {
  console.error('Error compiling TypeScript code:', error.message);
  process.exit(1);
}

console.log('\nBackend build process completed successfully!');
