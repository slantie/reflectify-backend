/**
 * @file src/api/v1/routes/feedbackForm/feedbackForm.routes.ts
 * @description Defines API routes for Feedback Form operations.
 * Maps URLs to controller methods and applies authentication/authorization middleware.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import {
  generateForms,
  getAllForms,
  getFormById,
  updateForm,
  softDeleteForm,
  addQuestionToForm,
  updateFormStatus,
  bulkUpdateFormStatus,
  getFormByAccessToken,
} from '../../../../controllers/feedbackForm/feedbackForm.controller';
import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Public route for form access via token (does NOT require isAuthenticated)
router.get('/access/:token', getFormByAccessToken);

// Apply authentication middleware to all other feedback form routes
router.use(isAuthenticated);

// --- More Specific Routes (Literal paths first, then parameterized specific paths) ---

// POST /api/v1/feedback-forms/generate
router.post(
  '/generate',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  generateForms
);

// PATCH /api/v1/feedback-forms/bulk-status
router.patch(
  '/bulk-status',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  bulkUpdateFormStatus
);

// POST /api/v1/feedback-forms/:id/questions (Add question to an existing form)
router.post(
  '/:id/questions',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  addQuestionToForm
);

// PATCH /api/v1/feedback-forms/:id/status (Update form status)
router.patch(
  '/:id/status',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  updateFormStatus
);

// --- Less Specific Routes (Generic ID routes) ---

// GET /api/v1/feedback-forms
// PATCH /api/v1/feedback-forms/:id
// DELETE /api/v1/feedback-forms/:id
router
  .route('/')
  .get(
    authorizeRoles(
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf,
    ),
    getAllForms
  );

router
  .route('/:id')
  .get(
    authorizeRoles(
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf,
    ),
    getFormById
  )
  .patch(authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD), updateForm)
  .delete(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    softDeleteForm
  );

export default router;
