// src/utils/validators/upload.validation.ts

import { z } from 'zod';
import { Designation, SemesterTypeEnum } from '@prisma/client'; // Import SubjectType enum

/**
 * @dev Zod schema for validating the structure of a single row of student data from an Excel file.
 * This schema defines the expected types and basic validation rules for each column.
 */
export const studentExcelRowSchema = z.object({
  studentName: z.string().min(1, 'Student name is required.').trim(),
  enrollmentNumber: z.string().min(1, 'Enrollment number is required.').trim(),
  deptAbbreviation: z
    .string()
    .min(1, 'Department abbreviation is required.')
    .trim(),
  semesterNumber: z
    .number()
    .int()
    .min(1, 'Semester number must be a positive integer.')
    .max(8, 'Semester number cannot exceed 8.'), // Assuming max 8 semesters
  divisionName: z.string().min(1, 'Division name is required.').trim(),
  studentBatch: z.string().min(1, 'Student batch is required.').trim(),
  email: z.string().email('Invalid email format.').toLowerCase().trim(),
  academicYearString: z
    .string()
    .min(1, 'Academic year string is required (e.g., "2023-2024").')
    .trim(),
  intakeYear: z
    .string()
    .min(4, 'Intake year must be a 4-digit string.')
    .max(4, 'Intake year must be a 4-digit string.')
    .trim(), // Assuming year as string
});

/**
 * @dev Zod schema for validating the structure of a single row of faculty data from an Excel file.
 * This schema defines the expected types and basic validation rules for each column.
 */
export const facultyExcelRowSchema = z.object({
  name: z.string().min(1, 'Faculty name is required.').trim(),
  email: z.string().email('Invalid email format.').toLowerCase().trim(),
  facultyAbbreviation: z.string().trim().nullable(), // Abbreviation can be optional/null
  designationString: z
    .string()
    .min(1, 'Designation is required.')
    .trim()
    .refine(
      (val) =>
        Object.values(Designation).some(
          (enumVal) => enumVal.toLowerCase() === val.toLowerCase()
        ) ||
        ['head of department', 'assistant professor', 'lab assistant'].includes(
          val.toLowerCase()
        ),
      `Invalid designation. Must be one of: ${Object.values(Designation).join(
        ', '
      )}, or their full forms (e.g., 'Head of Department').`
    ),
  deptInput: z.string().min(1, 'Department is required.').trim(),
  joiningDate: z.union([z.date(), z.string(), z.null()]).optional().nullable(), // Can be Date object, string, or null
});

/**
 * @dev Zod schema for validating the structure of a single row of subject data from an Excel file.
 * This schema defines the expected types and basic validation rules for each column.
 */
export const subjectExcelRowSchema = z
  .object({
    subjectName: z.string().min(1, 'Subject name is required.').trim(),
    subjectAbbreviation: z
      .string()
      .min(1, 'Subject abbreviation is required.')
      .trim(),
    subjectCode: z.string().min(1, 'Subject code is required.').trim(),
    semesterNumberStr: z.string().min(1, 'Semester number is required.').trim(), // Keep as string for initial parsing
    isElectiveStr: z
      .string()
      .min(1, 'Is Elective? field is required.')
      .toUpperCase()
      .trim()
      .refine(
        (val) => val === 'TRUE' || val === 'FALSE',
        "Is Elective? must be 'TRUE' or 'FALSE'."
      ),
    deptAbbreviationInput: z.string().min(1, 'Department is required.').trim(),
  })
  .refine(
    (data) => {
      // Further refine for semesterNumberStr to be a valid integer
      const semesterNum = parseInt(data.semesterNumberStr, 10);
      return !isNaN(semesterNum) && semesterNum >= 1 && semesterNum <= 8; // Assuming max 8 semesters
    },
    {
      message: 'Semester number must be a valid integer between 1 and 8.',
      path: ['semesterNumberStr'],
    }
  );

/**
 * @dev Zod schema for validating the properties of an uploaded file object
 * (e.g., req.file as provided by Multer).
 * Ensures correct file type, size, and presence of buffer.
 */
export const multerFileSchema = z.object({
  fieldname: z.string().min(1, 'File fieldname is required.'),
  originalname: z.string().min(1, 'Original filename is required.'),
  encoding: z.string().min(1, 'File encoding is required.'),
  mimetype: z
    .string()
    .refine(
      (mimetype) =>
        mimetype ===
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimetype === 'application/vnd.ms-excel',
      'Only .xlsx or .xls Excel files are allowed.'
    ),
  size: z.number().max(5 * 1024 * 1024, 'File size must not exceed 5MB.'), // 5MB limit
  buffer: z.instanceof(Buffer), // Ensure it's a buffer from memory storage
});

/**
 * @dev Zod schema for validating the file upload itself.
 * This schema explicitly states that the 'file' property on the request
 * (which will be req.file after Multer) must conform to multerFileSchema.
 * This might be used if you were validating the entire 'req' object, but it's
 * often more direct to validate `req.file` against `multerFileSchema`.
 */
export const fileUploadSchema = z.object({
  file: multerFileSchema, // This now references the dedicated multerFileSchema
});

/**
 * @dev Zod schema for validating the request body when uploading a faculty matrix.
 * Ensures required fields like academicYear, semesterRun, and deptAbbreviation are present and valid.
 */
export const uploadFacultyMatrixBodySchema = z.object({
  academicYear: z
    .string()
    .min(1, 'Academic Year is required.')
    .regex(
      /^\d{4}-\d{4}$/,
      'Academic Year must be in YYYY-YYYY format (e.g., 2023-2024).'
    )
    .trim(),
  semesterRun: z
    .nativeEnum(SemesterTypeEnum, {
      errorMap: () => ({ message: "Semester Run must be 'ODD' or 'EVEN'." }),
    })
    .transform((val) => val.toUpperCase()), // Ensure it's uppercase for enum matching
  deptAbbreviation: z
    .string()
    .min(1, 'Department Abbreviation is required.')
    .trim(),
});
