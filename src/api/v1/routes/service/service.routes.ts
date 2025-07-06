/**
 * @file src/api/v1/routes/service/service.routes.ts
 * @description Service-only routes for internal service-to-service communication
 * These routes use API key authentication instead of JWT tokens
 */

import { Router } from 'express';
import { serviceAuthMiddleware } from '../../../../middlewares/serviceAuth.middleware';
import {
  getFacultyAbbreviations,
  getFacultyAbbreviationsByDepartment,
} from '../../../../controllers/service/faculty.service.controller';
import {
  getSubjectAbbreviations,
  getSubjectAbbreviationsByDepartment,
} from '../../../../controllers/service/subject.service.controller';

const router = Router();

// Apply service authentication to all routes
router.use(serviceAuthMiddleware);

// Faculty service endpoints
router.get('/faculties/abbreviations', getFacultyAbbreviations);
router.get(
  '/faculties/abbreviations/:deptId',
  getFacultyAbbreviationsByDepartment
);

// Subject service endpoints
router.get('/subjects/abbreviations', getSubjectAbbreviations);
router.get(
  '/subjects/abbreviations/:deptId',
  getSubjectAbbreviationsByDepartment
);

export default router;
