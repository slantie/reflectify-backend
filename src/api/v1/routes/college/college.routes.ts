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

// Routes for managing the primary college (assuming a single primary college identified by COLLEGE_ID)
// These operations are likely restricted to Super Admin or specific Admins
router
  .route('/')
  .get(getColleges) // GET /api/v1/colleges (get all colleges, or just the primary one if only one exists)
  .post(authorizeRoles(Designation.SUPER_ADMIN), upsertPrimaryCollege); // POST /api/v1/colleges (create/upsert primary college)

router
  .route('/primary')
  .get(getPrimaryCollege) // GET /api/v1/colleges/primary
  .patch(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    updatePrimaryCollege
  ) // PATCH /api/v1/colleges/primary
  .delete(authorizeRoles(Designation.SUPER_ADMIN), softDeletePrimaryCollege); // DELETE /api/v1/colleges/primary (soft delete)

router.patch(
  '/primary/batch-update',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  batchUpdatePrimaryCollege
); // PATCH /api/v1/colleges/primary/batch-update

export default router;
