/**
 * @file src/utils/validators/student.validation.ts
 * @description Zod schemas for validating student related requests.
 */

import { z } from 'zod';

// Schema for creating a new student.
export const createStudentSchema = z.object({
  name: z.string().min(1, 'Student name is required.'),
  enrollmentNumber: z
    .string()
    .min(1, 'Enrollment number is required.')
    .regex(
      /^[A-Z0-9]+$/,
      'Enrollment number can only contain uppercase letters and numbers.'
    ),
  email: z.string().email('Invalid email address.'),
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format.')
    .min(10, 'Phone number must be at least 10 digits.'),
  academicYearId: z
    .string()
    .uuid('Invalid academic year ID format. Must be a UUID.'),
  batch: z.string().min(1, 'Batch is required.'),
  departmentId: z
    .string()
    .uuid('Invalid department ID format. Must be a UUID.'),
  semesterId: z.string().uuid('Invalid semester ID format. Must be a UUID.'),
  divisionId: z.string().uuid('Invalid division ID format. Must be a UUID.'),
  image: z.string().url('Invalid image URL format.').optional().nullable(),
});

// Schema for updating an existing student.
export const updateStudentSchema = z
  .object({
    name: z.string().min(1, 'Student name cannot be empty.').optional(),
    enrollmentNumber: z
      .string()
      .min(1, 'Enrollment number cannot be empty.')
      .regex(
        /^[A-Z0-9]+$/,
        'Enrollment number can only contain uppercase letters and numbers.'
      )
      .optional(),
    email: z.string().email('Invalid email address.').optional(),
    phoneNumber: z
      .string()
      .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format.')
      .min(10, 'Phone number must be at least 10 digits.')
      .optional(),
    academicYearId: z
      .string()
      .uuid('Invalid academic year ID format.')
      .optional(),
    batch: z.string().min(1, 'Batch cannot be empty.').optional(),
    departmentId: z.string().uuid('Invalid department ID format.').optional(),
    semesterId: z.string().uuid('Invalid semester ID format.').optional(),
    divisionId: z.string().uuid('Invalid division ID format.').optional(),
    image: z.string().url('Invalid image URL format.').optional().nullable(),
  })
  .refine(
    (data) => {
      // Ensures at least one field is provided for update.
      if (Object.keys(data).length === 0) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message:
              'No update data provided. At least one field is required for update.',
            path: [],
          },
        ]);
      }
      return true;
    },
    {
      message: 'No update data provided.',
      path: [],
    }
  );

// Schema for batch creating students.
export const batchCreateStudentsSchema = z.object({
  students: z.array(createStudentSchema),
});

// Schema for ID parameter validation.
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a UUID.' }),
});
