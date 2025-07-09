/**
 * @file src/api/v1/routes/dashboard/dashboard.routes.ts
 * @description Defines API routes for dashboard operations.
 * Maps URLs to controller methods and applies authentication/authorization middleware.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import {
  getDashboardStats,
  deleteAllData,
} from '../../../../controllers/dashboard/dashboard.controller';
import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all dashboard routes
router.use(isAuthenticated);

// Route for fetching dashboard statistics
router.get(
  '/stats',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getDashboardStats
);

// Route for deleting all database data (development only)
router.delete(
  '/delete-all-data',
  authorizeRoles(Designation.SUPER_ADMIN),
  deleteAllData
);

export default router;
