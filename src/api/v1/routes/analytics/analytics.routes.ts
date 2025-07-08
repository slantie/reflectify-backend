/**
 * @file src/api/v1/routes/analytics/analytics.routes.ts
 * @description Defines API routes for feedback analytics operations.
 * Maps URLs to controller methods and applies authentication/authorization middleware.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import {
  getOverallSemesterRating,
  getSemestersWithResponses,
  getSubjectWiseLectureLabRating,
  getHighImpactFeedbackAreas,
  getSemesterTrendAnalysis,
  getAnnualPerformanceTrend,
  getDivisionBatchComparisons,
  getLabLectureComparison,
  getFacultyPerformanceYearData,
  getAllFacultyPerformanceData,
  getTotalResponses,
  getSemesterDivisions,
  getFilterDictionary,
  getCompleteAnalyticsData,
} from '../../../../controllers/analytics/analytics.controller';
import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all analytics routes
router.use(isAuthenticated);

// Route to get semesters that have responses
router.get(
  '/semesters-with-responses',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getSemestersWithResponses
);

// Route to get overall semester rating
router.get(
  '/semesters/:id/overall-rating',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getOverallSemesterRating
);

// Route to get subject-wise lecture/lab rating
router.get(
  '/semesters/:id/subject-wise-rating',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getSubjectWiseLectureLabRating
);

// Route to get high impact feedback areas
router.get(
  '/semesters/:id/high-impact-areas',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getHighImpactFeedbackAreas
);

// Route to get semester trend analysis (optional subjectId in query)
router.get(
  '/semester-trend-analysis',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getSemesterTrendAnalysis
);

// Route to get annual performance trend
router.get(
  '/annual-performance-trend',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getAnnualPerformanceTrend
);

// Route to get division and batch comparisons
router.get(
  '/semesters/:id/division-batch-comparisons',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getDivisionBatchComparisons
);

// Route to get lab and lecture comparison
router.get(
  '/semesters/:id/lab-lecture-comparison',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getLabLectureComparison
);

// Route for single faculty performance data for a specific academic year
router.get(
  '/faculty/:facultyId/performance/:academicYearId',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getFacultyPerformanceYearData
);

// Route for all faculty performance data for a specific academic year
router.get(
  '/faculty/performance/:academicYearId',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  getAllFacultyPerformanceData
);

// Route for total responses count
router.get(
  '/total-responses',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getTotalResponses
);

// NEW: Route for semester divisions with response counts
router.get(
  '/semester-divisions-with-responses',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getSemesterDivisions
);

// NEW: Route for filter dictionary (Academic Years → Departments → Subjects)
router.get(
  '/filter-dictionary',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getFilterDictionary
);

// NEW: Route for complete analytics data with filters
router.get(
  '/complete-data',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getCompleteAnalyticsData
);

export default router;
