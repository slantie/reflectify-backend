/**
 * @file src/api/v1/routes/email/email.routes.ts
 * @description Defines API routes for email operations.
 * Maps URLs to controller methods and applies authentication/authorization middleware.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import { sendFormAccessEmails } from '../../../../controllers/email/email.controller';
import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all email routes
router.use(isAuthenticated);

// Route to trigger sending feedback form access emails
router.post(
  '/send-form-access',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  sendFormAccessEmails
);

export default router;
