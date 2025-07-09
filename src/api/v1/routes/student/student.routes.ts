/**
 * @file src/api/v1/routes/student/student.routes.ts
 * @description Defines API routes for Student operations.
 * Maps URLs to controller methods and applies authentication/authorization middleware.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import {
  getStudents,
  createStudent,
  getStudentById,
  updateStudent,
  softDeleteStudent,
  batchCreateStudents,
} from '../../../../controllers/student/student.controller';
import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all student routes
router.use(isAuthenticated);

router.post(
  '/batch',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  batchCreateStudents
);

// Routes for individual student operations
router
  .route('/')
  .get(getStudents)
  .post(
    authorizeRoles(
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf
    ),
    createStudent
  );

router
  .route('/:id')
  .get(getStudentById)
  .patch(
    authorizeRoles(
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf
    ),
    updateStudent
  )
  .delete(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    softDeleteStudent
  );

export default router;
