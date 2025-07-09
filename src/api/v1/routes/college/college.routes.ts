/**
 * @file src/api/v1/routes/college/college.routes.ts
 * @description Defines API routes for College operations.
 * Maps URLs to controller methods and applies authentication/authorization middleware.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import {
  getColleges,
  upsertPrimaryCollege,
  getPrimaryCollege,
  updatePrimaryCollege,
  softDeletePrimaryCollege,
  batchUpdatePrimaryCollege,
} from '../../../../controllers/college/college.controller';
import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all college routes
router.use(isAuthenticated);

// Routes for managing the primary college
router
  .route('/')
  .get(getColleges)
  .post(authorizeRoles(Designation.SUPER_ADMIN), upsertPrimaryCollege);

router
  .route('/primary')
  .get(getPrimaryCollege)
  .patch(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    updatePrimaryCollege
  )
  .delete(authorizeRoles(Designation.SUPER_ADMIN), softDeletePrimaryCollege);

router.patch(
  '/primary/batch-update',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  batchUpdatePrimaryCollege
);

export default router;
