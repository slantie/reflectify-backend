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

// --- Override Students Routes ---

// POST /api/v1/feedback-forms/:id/override-students/upload (Upload override students)
router.post(
  '/:id/override-students/upload',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  upload.single('file'),
  uploadOverrideStudents
);

// GET /api/v1/feedback-forms/:id/override-students/count (Get count of override students)
router.get(
  '/:id/override-students/count',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getOverrideStudentsCount
);

// GET /api/v1/feedback-forms/:id/override-students (Get paginated override students)
router.get(
  '/:id/override-students',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getOverrideStudents
);

// GET /api/v1/feedback-forms/:id/override-students/all (Get all override students without pagination)
router.get(
  '/:id/override-students/all',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getAllOverrideStudents
);

// DELETE /api/v1/feedback-forms/:id/override-students (Clear all override students)
router.delete(
  '/:id/override-students',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  clearOverrideStudents
);

// PATCH /api/v1/feedback-forms/:id/override-students/:studentId (Update specific override student)
router.patch(
  '/:id/override-students/:studentId',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  updateOverrideStudent
);

// DELETE /api/v1/feedback-forms/:id/override-students/:studentId (Delete specific override student)
router.delete(
  '/:id/override-students/:studentId',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  deleteOverrideStudent
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
