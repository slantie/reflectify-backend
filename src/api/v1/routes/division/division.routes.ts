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
  .get(getDivisions)
  .post(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    createDivision
  );

router
  .route('/:id')
  .get(getDivisionById)
  .patch(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    updateDivision
  )
  .delete(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    softDeleteDivision
  );

router.post(
  '/batch',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  batchCreateDivisions
);

export default router;
