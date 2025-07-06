/**
 * @file src/api/v1/routes/division/division.routes.ts
 * @description Defines API routes for Division operations.
 * Maps URLs to controller methods and applies authentication/authorization middleware.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import {
  getDivisions,
  createDivision,
  getDivisionById,
  updateDivision,
  softDeleteDivision,
  batchCreateDivisions,
} from '../../../../controllers/division/division.controller';
import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all division routes
router.use(isAuthenticated);

// Routes for individual division operations
router
  .route('/')
  .get(getDivisions) // GET /api/v1/divisions (can include query params: ?departmentId=<id>&semesterId=<id> for filtering)
  .post(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    createDivision
  ); // POST /api/v1/divisions

router
  .route('/:id')
  .get(getDivisionById) // GET /api/v1/divisions/:id
  .patch(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    updateDivision
  ) // PATCH /api/v1/divisions/:id
  .delete(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    softDeleteDivision
  ); // DELETE /api/v1/divisions/:id (soft delete)

router.post(
  '/batch',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  batchCreateDivisions
); // POST /api/v1/divisions/batch

export default router;
