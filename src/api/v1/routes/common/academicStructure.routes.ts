/**
 * @file src/api/v1/routes/academicStructure/academicStructure.routes.ts
 * @description Defines API routes for academic structure operations.
 * Maps URLs to controller methods and applies authentication middleware.
 */

import { Router } from 'express';
import { getAcademicStructure } from '../../../../controllers/common/academicStructure.controller';
import { isAuthenticated } from '../../../../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all academic structure routes
router.use(isAuthenticated);

// Route to get the academic structure
router.get('/', getAcademicStructure);

export default router;
