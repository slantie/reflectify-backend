/**
 * @file src/api/v1/routes/visualAnalytics/visualAnalytics.routes.ts
 * @description Defines API routes for visual analytics operations (chart data).
 * Maps URLs to controller methods and applies authentication/authorization middleware.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import {
  getGroupedBarChartData,
  getFacultyPerformanceDataForLineChart,
  getUniqueFacultiesWithResponses,
  getUniqueSubjectsWithResponses,
  getFacultyRadarData,
  getSubjectPerformanceData,
} from '../../../../controllers/analytics/visualAnalytics.controller';
import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all visual analytics routes
router.use(isAuthenticated);

// Route for grouped bar chart data (Faculty vs. Overall Subject Average)
router.get(
  '/grouped-bar-chart/:facultyId',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getGroupedBarChartData
);

// Route for line chart data (Faculty Lecture/Lab Performance over Semesters)
router.get(
  '/line-chart/:facultyId',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getFacultyPerformanceDataForLineChart
);

// Route for fetching unique faculties that have responses (for dropdowns/filters)
router.get(
  '/unique-faculties',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getUniqueFacultiesWithResponses
);

// Route for fetching unique subjects that have responses (for dropdowns/filters)
router.get(
  '/unique-subjects',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getUniqueSubjectsWithResponses
);

// Route for radar chart data (Faculty Lecture/Lab Ratings per Subject)
router.get(
  '/radar-chart/:facultyId',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getFacultyRadarData
);

// Route for subject-wise performance data (grouped by faculty, division, batch)
router.get(
  '/subject-performance/:subjectId',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getSubjectPerformanceData
);

export default router;
