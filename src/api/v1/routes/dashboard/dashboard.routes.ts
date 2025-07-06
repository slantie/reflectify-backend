/**
 * @file src/api/v1/routes/dashboard/dashboard.routes.ts
 * @description Defines API routes for dashboard operations.
 * Maps URLs to controller methods and applies authentication/authorization middleware.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import { getDashboardStats } from '../../../../controllers/dashboard/dashboard.controller';
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

export default router;
