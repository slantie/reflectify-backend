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

// Route for getting faculty abbreviations (optional department abbreviation)
router.get(
  '/abbreviations/:deptAbbr?',
  // authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD, Designation.AsstProf),
  getFacultyAbbreviations
); // GET /api/v1/faculties/abbreviations or /api/v1/faculties/abbreviations/:deptAbbr

router.post(
  '/batch',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  batchCreateFaculties
); // POST /api/v1/faculties/batch

// Routes for individual faculty operations
router
  .route('/')
  .get(getFaculties) // GET /api/v1/faculties
  .post(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    createFaculty
  ); // POST /api/v1/faculties

router
  .route('/:id')
  .get(getFacultyById) // GET /api/v1/faculties/:id
  .patch(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    updateFaculty
  ) // PATCH /api/v1/faculties/:id
  .delete(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    softDeleteFaculty
  ); // DELETE /api/v1/faculties/:id (soft delete)

export default router;
