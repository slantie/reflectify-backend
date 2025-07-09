/**
 * @file src/api/v1/routes/studentResponse/studentResponse.routes.ts
 * @description Defines API routes for Student Response operations.
 * These routes are accessible publicly via an access token for students to submit feedback.
 */

import { Router } from 'express';
import {
  submitResponses,
  checkSubmission,
} from '../../../../controllers/studentResponse/studentResponse.controller';

const router = Router();

// These routes are public as they are accessed by students via a unique token, and do not require prior general authentication.

// POST /api/v1/student-responses/submit/:token
router.post('/submit/:token', submitResponses);

// GET /api/v1/student-responses/check-submission/:token
router.get('/check-submission/:token', checkSubmission);

export default router;
