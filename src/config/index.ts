/**
 * @file src/config/index.ts
 * @description Centralized configuration file for environment variables.
 */

import dotenv from 'dotenv';
import path from 'path';

// Loads environment variables from the .env file.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Defines the application configuration object.
const config = {
  port: process.env.PORT || 8000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
};

// Performs basic validation for critical environment variables.
if (!config.databaseUrl) {
  console.error('FATAL ERROR: DATABASE_URL is not defined in .env');
  process.exit(1);
}
if (!config.jwtSecret) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in .env');
  process.exit(1);
}

export default config;
