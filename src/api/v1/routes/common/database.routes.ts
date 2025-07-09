/**
 * @file src/api/v1/routes/common/database.routes.ts
 * @description Defines API routes for database administrative operations.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import { cleanDatabase } from '../../../../controllers/common/database.controller';
import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Apply authentication and authorization middleware
router.use(isAuthenticated);
router.use(authorizeRoles(Designation.SUPER_ADMIN));

// Endpoint to clean all database tables.
router.delete('/clean', cleanDatabase);

export default router;
