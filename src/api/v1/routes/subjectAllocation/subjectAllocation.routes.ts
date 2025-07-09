/**
 * @file src/api/v1/routes/subjectAllocation/subjectAllocation.routes.ts
 * @description Defines API routes for Subject Allocation operations.
 * Maps URLs to controller methods and applies authentication/authorization middleware.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import {
  getAllSubjectAllocations,
  createSubjectAllocation,
  getSubjectAllocationById,
  updateSubjectAllocation,
  softDeleteSubjectAllocation,
} from '../../../../controllers/subjectAllocation/subjectAllocation.controller';
import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all subject allocation routes
router.use(isAuthenticated);

// Routes for individual subject allocation operations
router
  .route('/')
  .get(
    authorizeRoles(
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf
    ),
    getAllSubjectAllocations
  )
  .post(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    createSubjectAllocation
  );

router
  .route('/:id')
  .get(
    authorizeRoles(
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf
    ),
    getSubjectAllocationById
  )
  .patch(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    updateSubjectAllocation
  )
  .delete(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    softDeleteSubjectAllocation
  );

export default router;
