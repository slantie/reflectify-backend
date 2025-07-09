/**
 * @file src/api/v1/routes/semester/semester.routes.ts
 * @description Defines API routes for Semester operations.
 * Maps URLs to controller methods and applies authentication/authorization middleware.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import {
  getSemesters,
  createSemester,
  getSemesterById,
  updateSemester,
  softDeleteSemester,
  batchCreateSemesters,
  getSemestersByDepartment,
} from '../../../../controllers/semester/semester.controller';
import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all semester routes
router.use(isAuthenticated);

// Routes for individual semester operations
router
  .route('/')
  .get(getSemesters)
  .post(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    createSemester
  );

router
  .route('/:id')
  .get(getSemesterById)
  .patch(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    updateSemester
  )
  .delete(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    softDeleteSemester
  );

router.post(
  '/batch',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  batchCreateSemesters
);

// New route to get all semesters for a specific department
router.get(
  '/dept/:id',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf,
    Designation.LabAsst
  ),
  getSemestersByDepartment
);

export default router;
