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
} from '../../../../middlewares/auth.middleware'; // Assuming these exist

const router = Router();

// Apply authentication middleware to all dashboard routes
router.use(isAuthenticated);

// Route for fetching dashboard statistics
// Typically, dashboard stats are accessible by admins, HODs, etc.
router.get(
  '/stats',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ), // Example roles, adjust as needed
  getDashboardStats
); // GET /api/v1/dashboard/stats

// Route for deleting all database data (development only)
// Only accessible by super admins and only in development environment
router.delete(
  '/delete-all-data',
  authorizeRoles(Designation.SUPER_ADMIN), // Only super admins
  deleteAllData
); // DELETE /api/v1/dashboard/delete-all-data

export default router;
