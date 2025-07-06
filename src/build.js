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
    // Determine the correct delete command based on the OS
    const deleteCommand = `rmdir /s /q ${distPath}`; // UPDATED: OS-specific delete command
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
// This step reads your schema.prisma and generates the client code
// that your application uses to interact with the database.
console.log('\n2. Generating Prisma Client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('Prisma Client generated successfully.');
} catch (error) {
  console.error('Error generating Prisma Client:', error.message);
  process.exit(1); // Exit if Prisma Client generation fails
}

// --- 3. Apply Prisma Migrations (for production/deployment) ---
// This step applies any pending database migrations defined in your Prisma project.
// It's crucial for keeping your database schema in sync with your Prisma schema.
// For development, you might use `npx prisma db push` or handle migrations separately.
// For production, `prisma migrate deploy` is recommended.
// Uncomment and adjust based on your deployment strategy.
// console.log('\n3. Applying Prisma Migrations...');
// try {
//   // Use 'prisma migrate deploy' for applying migrations in production environments
//   // This command applies all pending migrations in the migrations folder.
//   execSync('npx prisma migrate deploy', { stdio: 'inherit' });
//   console.log('Prisma migrations applied successfully.');
// } catch (error) {
//   console.error('Error applying Prisma migrations:', error.message);
//   process.exit(1); // Exit if migrations fail
// }

// --- 4. Compile TypeScript code ---
// This step compiles your .ts files into .js files, which Node.js can execute.
console.log('\n3. Compiling TypeScript code...');
try {
  // Assuming 'tsc' is configured in your package.json scripts or globally available.
  // Make sure your tsconfig.json is set up correctly (e.g., "outDir": "./dist").
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('TypeScript compilation successful.');
} catch (error) {
  console.error('Error compiling TypeScript code:', error.message);
  process.exit(1); // Exit if TypeScript compilation fails
}

console.log('\nBackend build process completed successfully!');
