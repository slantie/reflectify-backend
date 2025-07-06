/**
 * @file src/config/index.ts
 * @description Centralized configuration file for environment variables.
 * Loads .env variables and provides them in a structured way.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: process.env.PORT || 8000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkey', // Replace with a strong secret in production
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  // Add other environment variables as needed (e.g., email service credentials)
};

// Basic validation for critical environment variables
if (!config.databaseUrl) {
  console.error('FATAL ERROR: DATABASE_URL is not defined in .env');
  process.exit(1); // Exit the process if a critical env var is missing
}
if (!config.jwtSecret) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in .env');
  process.exit(1);
}

export default config;
