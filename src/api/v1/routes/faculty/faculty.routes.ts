/**
 * @file src/api/v1/routes/faculty/faculty.routes.ts
 * @description Defines API routes for Faculty operations.
 * Maps URLs to controller methods and applies authentication/authorization middleware.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import {
  getFaculties,
  createFaculty,
  getFacultyById,
  updateFaculty,
  softDeleteFaculty,
  batchCreateFaculties,
  getFacultyAbbreviations,
} from '../../../../controllers/faculty/faculty.controller';
import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all faculty routes
router.use(isAuthenticated);

// IMPORTANT: Place more specific routes BEFORE generic parameter routes (like /:id)

// Route for getting faculty abbreviations
router.get(
  '/abbreviations/:deptAbbr?',
  // authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD, Designation.AsstProf),
  getFacultyAbbreviations
);

// Route for batch creating faculties
router.post(
  '/batch',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  batchCreateFaculties
);

// Routes for individual faculty operations
router
  .route('/')
  .get(getFaculties)
  .post(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    createFaculty
  );

router
  .route('/:id')
  .get(getFacultyById)
  .patch(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    updateFaculty
  )
  .delete(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    softDeleteFaculty
  );

export default router;
