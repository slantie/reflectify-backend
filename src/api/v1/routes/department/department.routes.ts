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
  .get(getDepartments)
  .post(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    createDepartment
  );

router
  .route('/:id')
  .get(getDepartmentById)
  .patch(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    updateDepartment
  )
  .delete(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    softDeleteDepartment
  );

router.post(
  '/batch',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  batchCreateDepartments
);

export default router;
