/**
 * @file src/types/express.d.ts
 * @description Extends Express Request interface to include custom 'admin' property.
 */

import { Admin } from '@prisma/client';

declare global {
  namespace Express {
    // Adds an 'admin' property to the Request object.
    interface Request {
      admin?: Pick<Admin, 'id' | 'email' | 'isSuper' | 'name' | 'designation'>;
    }
  }
}

export {};
