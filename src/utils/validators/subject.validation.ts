// src/utils/validators/subject.validation.ts

import { z } from 'zod';
import { SubjectType } from '@prisma/client'; // Import SubjectType enum from Prisma client

/**
 * @dev Zod schema for validating the creation of a new subject.
 * Ensures all required fields are present and have the correct types.
 */
export const createSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required.'),
  abbreviation: z
    .string()
    .min(1, 'Abbreviation is required.')
    .max(10, 'Abbreviation cannot exceed 10 characters.'),
  subjectCode: z
    .string()
    .min(1, 'Subject code is required.')
    .max(20, 'Subject code cannot exceed 20 characters.'),
  type: z.nativeEnum(SubjectType).default(SubjectType.MANDATORY), // Validate against Prisma's SubjectType enum
  departmentId: z
    .string()
    .uuid('Invalid department ID format. Must be a UUID.'),
  semesterId: z.string().uuid('Invalid semester ID format. Must be a UUID.'),
});

/**
 * @dev Zod schema for validating the update of an existing subject.
 * All fields are optional, allowing for partial updates.
 */
export const updateSubjectSchema = z
  .object({
    name: z.string().min(1, 'Subject name cannot be empty.').optional(),
    abbreviation: z
      .string()
      .min(1, 'Abbreviation cannot be empty.')
      .max(10, 'Abbreviation cannot exceed 10 characters.')
      .optional(),
    subjectCode: z
      .string()
      .min(1, 'Subject code cannot be empty.')
      .max(20, 'Subject code cannot exceed 20 characters.')
      .optional(),
    type: z.nativeEnum(SubjectType).optional(),
    departmentId: z.string().uuid('Invalid department ID format.').optional(),
    semesterId: z.string().uuid('Invalid semester ID format.').optional(),
    isDeleted: z.boolean().optional(), // Allow updating soft delete status
  })
  .refine(
    (data) => {
      // Ensure at least one field is provided for update
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

/**
 * @dev Zod schema for validating ID parameters in requests.
 * Ensures the ID is a valid UUID format.
 */
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a UUID.' }),
});

/**
 * @dev Zod schema for validating the semester ID parameter in requests.
 * Ensures the ID is a valid UUID format.
 */
export const semesterIdParamSchema = z.object({
  semesterId: z.string().uuid('Invalid semester ID format. Must be a UUID.'),
});

/**
 * @dev Zod schema for validating the department abbreviation parameter in requests.
 * Ensures the abbreviation is a string.
 */
export const departmentAbbreviationParamSchema = z.object({
  deptAbbr: z
    .string()
    .min(1, 'Department abbreviation cannot be empty.')
    .optional(), // Optional for fetching all
});

/**
 * @dev Zod schema for validating a batch creation of subjects.
 * Expects an array of objects conforming to `createSubjectSchema`.
 */
export const batchCreateSubjectsSchema = z.object({
  subjects: z
    .array(createSubjectSchema)
    .min(1, 'At least one subject is required for batch creation.'),
});
