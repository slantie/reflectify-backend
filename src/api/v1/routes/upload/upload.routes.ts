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

// Multer configuration for file uploads (can be shared or specific per route)
const upload = multer({
  storage: multer.memoryStorage(), // Store file in memory as a Buffer
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

// Apply authentication and authorization middleware to all upload routes
router.use(isAuthenticated);
router.use(authorizeRoles(Designation.SUPER_ADMIN, Designation.HOD)); // Assuming Admin/HOD roles for uploads

/**
 * @route POST /api/v1/upload/student-data
 * @description Route for uploading and processing student data from an Excel file.
 * Uses Multer middleware to handle the file upload.
 * Expected field name for the file is 'file'.
 */
router.post(
  '/student-data',
  upload.single('file'), // Multer expects the field name 'file' for the uploaded Excel
  uploadStudentData
);

/**
 * @route POST /api/v1/upload/faculty-data
 * @description Route for uploading and processing faculty data from an Excel file.
 * Uses Multer middleware to handle the file upload.
 * Expected field name for the file is 'file'.
 */
router.post(
  '/faculty-data',
  upload.single('file'), // Multer expects the field name 'file' for the uploaded Excel
  uploadFacultyData
);

/**
 * @route POST /api/v1/upload/subject-data
 * @description Route for uploading and processing subject data from an Excel file.
 * Uses Multer middleware to handle the file upload.
 * Expected field name for the file is 'file'.
 */
router.post('/subject-data', upload.single('file'), uploadSubjectData);

/**
 * @route POST /api/v1/upload/faculty-matrix
 * @description Route for uploading and processing faculty matrix data from an Excel file.
 * Uses Multer middleware to handle the file upload.
 * Expected field name for the file is 'file'.
 */
router.post('/faculty-matrix', upload.single('file'), uploadFacultyMatrix);

export default router;
