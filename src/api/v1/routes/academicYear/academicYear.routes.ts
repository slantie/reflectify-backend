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
router.route('/').post(createAcademicYear).get(getAllAcademicYears);

// Route to get the active academic year (must come before /:id route)
router.route('/active').get(getActiveAcademicYear);

router
  .route('/:id')
  .get(getAcademicYearById)
  .patch(updateAcademicYear)
  .delete(deleteAcademicYear);

export default router;
