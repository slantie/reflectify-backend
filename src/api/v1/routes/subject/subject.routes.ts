/**
 * @file src/api/v1/routes/subject/subject.routes.ts
 * @description Defines API routes for Subject operations.
 * Maps URLs to controller methods and applies authentication/authorization middleware.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import {
  getAllSubjects,
  createSubject,
  getSubjectById,
  updateSubject,
  softDeleteSubject,
  getSubjectsBySemester,
  getSubjectAbbreviations,
  batchCreateSubjects,
} from '../../../../controllers/subject/subject.controller';
import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all subject routes
router.use(isAuthenticated);

// Routes for specific paths
router.get(
  '/semester/:semesterId',
  authorizeRoles(
    Designation.SUPER_ADMIN,
    Designation.HOD,
    Designation.AsstProf
  ),
  getSubjectsBySemester
);
router.get(
  '/abbreviations/:deptAbbr?',
  // authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD, Designation.AsstProf),
  getSubjectAbbreviations
);
router.post(
  '/batch',
  authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
  batchCreateSubjects
);

// Routes for individual subject operations
router
  .route('/')
  .get(
    authorizeRoles(
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf
    ),
    getAllSubjects
  )
  .post(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    createSubject
  );

router
  .route('/:id')
  .get(
    authorizeRoles(
      Designation.SUPER_ADMIN,
      Designation.HOD,
      Designation.AsstProf
    ),
    getSubjectById
  )
  .patch(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    updateSubject
  )
  .delete(
    authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD),
    softDeleteSubject
  );

export default router;
