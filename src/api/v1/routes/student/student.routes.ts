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

// Routes for individual student operations
router
  .route('/')
  .get(getStudents) // GET /api/v1/students
  .post(
    authorizeRoles(
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf
    ),
    createStudent
  ); // POST /api/v1/students

router
  .route('/:id')
  .get(getStudentById) // GET /api/v1/students/:id
  .patch(
    authorizeRoles(
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf
    ),
    updateStudent
  ) // PATCH /api/v1/students/:id
  .delete(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    softDeleteStudent
  ); // DELETE /api/v1/students/:id (soft delete)

router.post(
  '/batch',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  batchCreateStudents
); // POST /api/v1/students/batch

export default router;
