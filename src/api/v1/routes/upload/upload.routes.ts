/**
 * @file src/api/v1/routes/upload/upload.routes.ts
 * @description Defines API routes for various data upload operations.
 * Applies Multer middleware and authentication/authorization.
 */

import { Router } from 'express';
import { Designation } from '@prisma/client';
import multer from 'multer';
import { uploadStudentData } from '../../../../controllers/upload/studentData.controller';
import { uploadFacultyData } from '../../../../controllers/upload/facultyData.controller';
import { uploadSubjectData } from '../../../../controllers/upload/subjectData.controller';
import { uploadFacultyMatrix } from '../../../../controllers/upload/facultyMatrix.controller';

import {
  isAuthenticated,
  authorizeRoles,
} from '../../../../middlewares/auth.middleware';

const router = Router();

// Multer configuration for file uploads - 10 MB File Size Limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Apply authentication and authorization middleware to all upload routes
router.use(isAuthenticated);
router.use(authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD));

// Route for uploading and processing student data from an Excel file.
router.post('/student-data', upload.single('file'), uploadStudentData);

// Route for uploading and processing faculty data from an Excel file.
router.post('/faculty-data', upload.single('file'), uploadFacultyData);

// Route for uploading and processing subject data from an Excel file.
router.post('/subject-data', upload.single('file'), uploadSubjectData);

// Route for uploading and processing faculty matrix data from an Excel file.
router.post('/faculty-matrix', upload.single('file'), uploadFacultyMatrix);

export default router;
