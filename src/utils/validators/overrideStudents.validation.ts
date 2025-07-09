/**
 * @file src/utils/validators/overrideStudents.validation.ts
 * @description Zod schemas for validating override student related requests.
 */

import { z } from 'zod';

// Schema for validating a single override student row from Excel.
export const overrideStudentExcelRowSchema = z.object({
  studentName: z
    .string()
    .min(1, 'Student name is required')
    .max(255, 'Student name must be less than 255 characters')
    .trim(),
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase(),
  enrollmentNumber: z
    .string()
    .optional()
    .refine((val) => !val || val.trim().length > 0, {
      message: 'Enrollment number cannot be empty if provided',
    })
    .transform((val) => val?.trim() || undefined),
  batch: z
    .string()
    .optional()
    .refine((val) => !val || val.trim().length > 0, {
      message: 'Batch cannot be empty if provided',
    })
    .transform((val) => val?.trim() || undefined),
  phoneNumber: z
    .string()
    .optional()
    .refine((val) => !val || val.trim().length > 0, {
      message: 'Phone number cannot be empty if provided',
    })
    .transform((val) => val?.trim() || undefined),
  department: z
    .string()
    .optional()
    .refine((val) => !val || val.trim().length > 0, {
      message: 'Department cannot be empty if provided',
    })
    .transform((val) => val?.trim() || undefined),
  semester: z
    .string()
    .optional()
    .refine((val) => !val || val.trim().length > 0, {
      message: 'Semester cannot be empty if provided',
    })
    .transform((val) => val?.trim() || undefined),
});

// Schema for validating file upload request.
export const overrideStudentsFileUploadSchema = z.object({
  file: z.object({
    fieldname: z.string(),
    originalname: z.string(),
    encoding: z.string(),
    mimetype: z.enum(
      [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ],
      {
        message: 'File must be an Excel (.xlsx, .xls) or CSV file',
      }
    ),
    buffer: z.instanceof(Buffer),
    size: z.number().max(5 * 1024 * 1024, 'File size must be less than 5MB'),
  }),
});

// Schema for validating form ID parameter.
export const formIdParamSchema = z.object({
  id: z.string().uuid('Invalid form ID format'),
});

// Schema for getting override students list.
export const getOverrideStudentsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, 'Page must be greater than 0'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
});

// Schema for updating an override student.
export const updateOverrideStudentSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Student name is required')
      .max(255, 'Student name must be less than 255 characters')
      .trim()
      .optional(),
    email: z
      .string()
      .email('Invalid email format')
      .max(255, 'Email must be less than 255 characters')
      .trim()
      .toLowerCase()
      .optional(),
    enrollmentNumber: z
      .string()
      .optional()
      .refine((val) => !val || val.trim().length > 0, {
        message: 'Enrollment number cannot be empty if provided',
      })
      .transform((val) => val?.trim() || undefined),
    batch: z
      .string()
      .optional()
      .refine((val) => !val || val.trim().length > 0, {
        message: 'Batch cannot be empty if provided',
      })
      .transform((val) => val?.trim() || undefined),
    phoneNumber: z
      .string()
      .optional()
      .refine((val) => !val || val.trim().length > 0, {
        message: 'Phone number cannot be empty if provided',
      })
      .transform((val) => val?.trim() || undefined),
    department: z
      .string()
      .optional()
      .refine((val) => !val || val.trim().length > 0, {
        message: 'Department cannot be empty if provided',
      })
      .transform((val) => val?.trim() || undefined),
    semester: z
      .string()
      .optional()
      .refine((val) => !val || val.trim().length > 0, {
        message: 'Semester cannot be empty if provided',
      })
      .transform((val) => val?.trim() || undefined),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// Schema for override student ID parameter.
export const overrideStudentIdParamSchema = z.object({
  studentId: z.string().uuid('Invalid override student ID format'),
});
