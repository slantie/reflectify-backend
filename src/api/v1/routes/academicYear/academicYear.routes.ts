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

router
  .route('/:id')
  .get(getAcademicYearById)
  .patch(updateAcademicYear)
  .delete(deleteAcademicYear);

// Route to get the active academic year
router.route('/active').get(getActiveAcademicYear);

export default router;
