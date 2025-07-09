/**
 * @file src/api/v1/routes/academic-year/academic-year.routes.ts
 * @description Defines API routes for Academic Year operations.
 * Maps URLs to controller methods.
 */

import { Router } from 'express';
import {
  createAcademicYear,
  getAllAcademicYears,
  getAcademicYearById,
  updateAcademicYear,
  deleteAcademicYear,
  getActiveAcademicYear,
} from '../../../../controllers/academicYear/academicYear.controller';

const router = Router();

// Define routes for Academic Years
router
  .route('/')
  .post(createAcademicYear) // POST /api/v1/academic-years
  .get(getAllAcademicYears); // GET /api/v1/academic-years

router
  .route('/:id')
  .get(getAcademicYearById) // GET /api/v1/academic-years/:id
  .patch(updateAcademicYear) // PATCH /api/v1/academic-years/:id (using PATCH for partial updates)
  .delete(deleteAcademicYear); // DELETE /api/v1/academic-years/:id (soft delete)

// Route to get the active academic year
router.route('/active').get(getActiveAcademicYear); // GET /api/v1/academic-years/active

export default router;
