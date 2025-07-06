/**
 * @file src/api/v1/routes/auth/auth.routes.ts
 * @description Defines API routes for authentication and admin profile management.
 * Maps URLs to controller methods and applies authentication middleware.
 */

import { Router } from 'express';
import {
  registerAdmin,
  registerSuperAdmin,
  loginAdmin,
  getMe,
  updateAdminPassword,
} from '../../../../controllers/auth/auth.controller';
import { isAuthenticated } from '../../../../middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/register', registerAdmin); // Register a regular admin
router.post('/super-register', registerSuperAdmin); // Register a super admin (should be protected by initial setup)
router.post('/login', loginAdmin); // Login an admin

// Protected routes (require authentication)
// Apply isAuthenticated middleware to all routes below this line
router.use(isAuthenticated);

router.get('/me', getMe); // Get current admin's profile
router.patch('/update-password', updateAdminPassword); // Update current admin's password

// Example of role-based authorization (uncomment and use when needed)
// router.get('/admin-only-data', authorizeRoles(Designation.SUPER_ADMIN), (req, res) => {
//     res.status(200).json({ status: 'success', message: 'This is super admin only data!' });
// });

export default router;
