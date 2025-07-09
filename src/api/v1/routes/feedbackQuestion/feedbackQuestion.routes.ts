/**
 * @file src/api/v1/routes/feedbackQuestion/feedbackQuestion.routes.ts
 * @description Defines API routes for Feedback Question and Question Category operations.
 * Maps URLs to controller methods and applies authentication/authorization middleware.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import {
  getAllQuestionCategories,
  getQuestionCategoryById,
  createQuestionCategory,
  updateQuestionCategory,
  softDeleteQuestionCategory,
  createFeedbackQuestion,
  updateFeedbackQuestion,
  softDeleteFeedbackQuestion,
  getFeedbackQuestionsByFormId,
  batchUpdateFeedbackQuestions,
} from '../../../../controllers/feedbackQuestion/feedbackQuestion.controller';
import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all feedback question and category routes
router.use(isAuthenticated);

// PATCH /api/v1/feedback-questions/questions/batch
router.patch(
  '/questions/batch',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  batchUpdateFeedbackQuestions
);

// GET /api/v1/feedback-questions/form/:formId/questions
// POST /api/v1/feedback-questions/form/:formId/questions
router
  .route('/form/:formId/questions')
  .get(
    authorizeRoles(
      Designation.HOD,
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf,
      Designation.HOD
    ),
    getFeedbackQuestionsByFormId
  )
  .post(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    createFeedbackQuestion
  );
Designation.HOD;
// GET /api/v1/feedback-questions/categories
// POST /api/v1/feedback-questions/categories
router
  .route('/categories')
  .get(
    authorizeRoles(
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf
    ),
    getAllQuestionCategories
  )
  .post(
    authorizeRoles(
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf
    ),
    createQuestionCategory
  );

// GET /api/v1/feedback-questions/categories/:id
// PATCH /api/v1/feedback-questions/categories/:id
// DELETE /api/v1/feedback-questions/categories/:id
router
  .route('/categories/:id')
  .get(
    authorizeRoles(
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf
    ),
    getQuestionCategoryById
  )
  .patch(
    authorizeRoles(
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf
    ),
    updateQuestionCategory
  )
  .delete(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    softDeleteQuestionCategory
  );

// PATCH /api/v1/feedback-questions/questions/:id
// DELETE /api/v1/feedback-questions/questions/:id
router
  .route('/questions/:id')
  .patch(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    updateFeedbackQuestion
  )
  .delete(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    softDeleteFeedbackQuestion
  );

export default router;
