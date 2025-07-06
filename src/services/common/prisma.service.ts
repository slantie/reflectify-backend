/**
 * @file src/services/common/prisma.service.ts
 * @description Provides a singleton instance of the PrismaClient.
 * This ensures that only one connection pool to the database is maintained.
 */

import { PrismaClient } from '@prisma/client';

// Declare a global variable for PrismaClient to prevent multiple instances in development
// (especially with hot-reloading).
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

// Check if PrismaClient instance already exists in global scope (for development hot-reloading)
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export { prisma };
