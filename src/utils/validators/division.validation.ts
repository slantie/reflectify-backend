/**
 * @file src/utils/validators/division.validation.ts
 * @description Zod schemas for validating division related requests.
 */

import { z } from 'zod';

// Schema for creating a new division.
export const createDivisionSchema = z.object({
  departmentId: z
    .string()
    .uuid('Invalid department ID format. Must be a UUID.'),
  semesterId: z.string().uuid('Invalid semester ID format. Must be a UUID.'),
  divisionName: z.string().min(1, 'Division name is required.'),
  studentCount: z
    .number()
    .int()
    .min(0, 'Student count cannot be negative.')
    .optional(),
});

// Schema for updating an existing division.
export const updateDivisionSchema = z
  .object({
    departmentId: z.string().uuid('Invalid department ID format.').optional(),
    semesterId: z.string().uuid('Invalid semester ID format.').optional(),
    divisionName: z
      .string()
      .min(1, 'Division name cannot be empty.')
      .optional(),
    studentCount: z
      .number()
      .int()
      .min(0, 'Student count cannot be negative.')
      .optional(),
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

// Schema for query parameters when getting divisions.
export const getDivisionsQuerySchema = z
  .object({
    departmentId: z.string().uuid('Invalid department ID format.').optional(),
    semesterId: z.string().uuid('Invalid semester ID format.').optional(),
  })
  .refine(
    (data) => {
      // Requires both or neither for filtering.
      if (
        (data.departmentId && !data.semesterId) ||
        (!data.departmentId && data.semesterId)
      ) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message:
              'Both departmentId and semesterId must be provided if filtering, or neither.',
            path: ['departmentId', 'semesterId'],
          },
        ]);
      }
      return true;
    },
    {
      message:
        'Both departmentId and semesterId must be provided if filtering.',
      path: ['departmentId', 'semesterId'],
    }
  );

// Schema for batch creating divisions.
export const batchCreateDivisionsSchema = z.object({
  divisions: z.array(createDivisionSchema),
});

// Schema for ID parameter validation.
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a UUID.' }),
});
