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
  promoteAllStudents,
  getPromotionPreview,
} from '../../../../controllers/student/promotion.controller';
import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all student routes
router.use(isAuthenticated);

// Promotion routes (must come before /:id routes)
router.get(
  '/promote/preview',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  getPromotionPreview
); // GET /api/v1/students/promote/preview

router.post(
  '/promote',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  promoteAllStudents
); // POST /api/v1/students/promote

router.post(
  '/batch',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  batchCreateStudents
); // POST /api/v1/students/batch

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

export default router;
