/**
 * @file src/api/v1/routes/feedbackForm/feedbackForm.routes.ts
 * @description Defines API routes for Feedback Form operations.
 * Maps URLs to controller methods and applies authentication/authorization middleware.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import multer from 'multer';
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
  expireOldForms,
} from '../../../../controllers/feedbackForm/feedbackForm.controller';
import {
  uploadOverrideStudents,
  getOverrideStudents,
  getAllOverrideStudents,
  updateOverrideStudent,
  deleteOverrideStudent,
  clearOverrideStudents,
  getOverrideStudentsCount,
} from '../../../../controllers/overrideStudents/overrideStudents.controller';
import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Multer configuration for override students file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Public route for form access via token
router.get('/access/:token', getFormByAccessToken);

// Apply authentication middleware to all other feedback form routes
router.use(isAuthenticated);

// POST /api/v1/feedback-forms/generate
router.post(
  '/generate',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  generateForms
);

// POST /api/v1/feedback-forms/expire-old
router.post(
  '/expire-old',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  expireOldForms
);

// PATCH /api/v1/feedback-forms/bulk-status
router.patch(
  '/bulk-status',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  bulkUpdateFormStatus
);

// POST /api/v1/feedback-forms/:id/questions
router.post(
  '/:id/questions',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  addQuestionToForm
);

// PATCH /api/v1/feedback-forms/:id/status
router.patch(
  '/:id/status',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  updateFormStatus
);

// Update Form Details - Title, Description, etc.
router.patch(
  '/:id/details',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  updateForm
);

// --- Override Students Routes ---

// POST /api/v1/feedback-forms/:id/override-students/upload
router.post(
  '/:id/override-students/upload',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  upload.single('file'),
  uploadOverrideStudents
);

// GET /api/v1/feedback-forms/:id/override-students/count
router.get(
  '/:id/override-students/count',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getOverrideStudentsCount
);

// GET /api/v1/feedback-forms/:id/override-students
router.get(
  '/:id/override-students',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getOverrideStudents
);

// GET /api/v1/feedback-forms/:id/override-students/all
router.get(
  '/:id/override-students/all',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getAllOverrideStudents
);

// DELETE /api/v1/feedback-forms/:id/override-students
router.delete(
  '/:id/override-students',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  clearOverrideStudents
);

// PATCH /api/v1/feedback-forms/:id/override-students/:studentId
router.patch(
  '/:id/override-students/:studentId',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  updateOverrideStudent
);

// DELETE /api/v1/feedback-forms/:id/override-students/:studentId
router.delete(
  '/:id/override-students/:studentId',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  deleteOverrideStudent
);

// --- Less Specific Routes (Generic ID routes) ---

router
  .route('/')
  .get(
    authorizeRoles(
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf
    ),
    getAllForms
  );

router
  .route('/:id')
  .get(
    authorizeRoles(
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf
    ),
    getFormById
  )
  .patch(authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD), updateForm)
  .delete(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    softDeleteForm
  );

export default router;
