/**
 * @file src/server.ts
 * @description Main entry point for the Reflectify backend application.
 * Initializes the Express app and starts the server.
 */

import app from './app';
import { setupScheduledTasks } from './utils/scheduler';
import { VercelRequest, VercelResponse } from '@vercel/node';

setupScheduledTasks(); // ✅ this runs once per cold start

// Start the Express server and listen on the specified port.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  app(req as any, res as any); // let Express handle it
}

// Handle unhandled promise rejections globally.
process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
});

// Handle uncaught exceptions globally.
process.on('uncaughtException', (err: Error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});
