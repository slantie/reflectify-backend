/**
 * @file src/api/v1/routes/department/department.routes.ts
 * @description Defines API routes for Department operations.
 * Maps URLs to controller methods and applies authentication/authorization middleware.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import {
  getDepartments,
  createDepartment,
  getDepartmentById,
  updateDepartment,
  softDeleteDepartment,
  batchCreateDepartments,
} from '../../../../controllers/department/department.controller';
import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all department routes
router.use(isAuthenticated);

// Routes for individual department operations
router
  .route('/')
  .get(getDepartments) // GET /api/v1/departments
  .post(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    createDepartment
  ); // POST /api/v1/departments

router
  .route('/:id')
  .get(getDepartmentById) // GET /api/v1/departments/:id
  .patch(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    updateDepartment
  ) // PATCH /api/v1/departments/:id
  .delete(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    softDeleteDepartment
  ); // DELETE /api/v1/departments/:id (soft delete)

router.post(
  '/batch',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  batchCreateDepartments
); // POST /api/v1/departments/batch

export default router;
