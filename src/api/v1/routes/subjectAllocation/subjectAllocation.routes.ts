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
  ) // GET /api/v1/subject-allocations
  .post(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    createSubjectAllocation
  ); // POST /api/v1/subject-allocations

router
  .route('/:id')
  .get(
    authorizeRoles(
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf
    ),
    getSubjectAllocationById
  ) // GET /api/v1/subject-allocations/:id
  .patch(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    updateSubjectAllocation
  ) // PATCH /api/v1/subject-allocations/:id
  .delete(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    softDeleteSubjectAllocation
  ); // DELETE /api/v1/subject-allocations/:id (soft delete)

export default router;
