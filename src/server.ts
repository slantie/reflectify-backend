/**
 * @file src/server.ts
 * @description Main entry point for the Reflectify backend application.
 * Initializes the Express app and starts the server.
 */

import app from './app'; // Import the configured Express app
import config from './config'; // Import application configuration

const PORT = config.port;

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
  console.log(`Access API at: http://localhost:${PORT}/api/v1`);
});

// Handle unhandled promise rejections (e.g., database connection errors)
process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  // Close server and exit process
  server.close(() => {
    process.exit(1); // 1 indicates uncaught fatal exception
  });
});

// Handle uncaught exceptions (synchronous errors)
process.on('uncaughtException', (err: Error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  // Exit process immediately
  process.exit(1);
});
