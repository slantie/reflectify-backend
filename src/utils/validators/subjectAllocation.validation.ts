// src/utils/validators/subjectAllocation.validation.ts

import { z } from 'zod';
import { LectureType } from '@prisma/client'; // Import LectureType enum from Prisma client

/**
 * @dev Zod schema for validating the creation of a new subject allocation.
 * Ensures all required fields are present and have the correct types.
 * 'academicYear' is expected as a string (e.g., "2023-2024") for lookup in service.
 */
export const createSubjectAllocationSchema = z.object({
  facultyId: z.string().uuid('Invalid faculty ID format. Must be a UUID.'),
  subjectId: z.string().uuid('Invalid subject ID format. Must be a UUID.'),
  divisionId: z.string().uuid('Invalid division ID format. Must be a UUID.'),
  semesterId: z.string().uuid('Invalid semester ID format. Must be a UUID.'),
  departmentId: z
    .string()
    .uuid('Invalid department ID format. Must be a UUID.'), // Explicitly require departmentId
  lectureType: z.nativeEnum(LectureType), // Validate against Prisma's LectureType enum
  academicYear: z
    .string()
    .min(1, 'Academic year string is required (e.g., "2023-2024").'), // String for lookup
  batch: z.string().default('-').optional(), // Batch is optional, defaults to "-"
});

/**
 * @dev Zod schema for validating the update of an existing subject allocation.
 * All fields are optional, allowing for partial updates.
 */
export const updateSubjectAllocationSchema = z
  .object({
    facultyId: z.string().uuid('Invalid faculty ID format.').optional(),
    subjectId: z.string().uuid('Invalid subject ID format.').optional(),
    divisionId: z.string().uuid('Invalid division ID format.').optional(),
    semesterId: z.string().uuid('Invalid semester ID format.').optional(),
    departmentId: z.string().uuid('Invalid department ID format.').optional(),
    lectureType: z.nativeEnum(LectureType).optional(),
    academicYear: z
      .string()
      .min(1, 'Academic year string cannot be empty.')
      .optional(),
    batch: z.string().optional(),
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
