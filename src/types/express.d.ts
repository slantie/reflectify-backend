/**
 * @file src/types/express.d.ts
 * @description Extends Express Request interface to include custom properties
 * like 'admin' which is populated by authentication middleware.
 */

// Import the Admin type from Prisma client to ensure type safety
import { Admin } from '@prisma/client';

// Declare global namespace for Express to augment its interfaces
declare global {
  namespace Express {
    // Extend the Request interface
    interface Request {
      // Add an 'admin' property to the Request object.
      // This property will hold the authenticated admin's details (e.g., id, email, isSuper)
      // after the authentication middleware has successfully verified the token.
      admin?: Pick<Admin, 'id' | 'email' | 'isSuper' | 'name' | 'designation'>; // UPDATED: Added 'name' and 'designation'
    }
  }
}

export {}; // This is needed to make the file a module
