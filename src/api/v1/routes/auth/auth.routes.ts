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
router.post('/register', registerAdmin);
router.post('/super-register', registerSuperAdmin);
router.post('/login', loginAdmin);

// Protected routes (require authentication)
router.use(isAuthenticated);

router.get('/me', getMe);
router.patch('/update-password', updateAdminPassword);

export default router;
