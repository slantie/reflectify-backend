/**
 * @file src/utils/validators/academicYear.validation.ts
 * @description Zod schemas for validating academic year related requests.
 */

import { z } from 'zod';

// Schema for creating a new academic year.
export const createAcademicYearSchema = z.object({
  yearString: z
    .string({
      required_error: 'Academic year string is required.',
    })
    .min(1, 'Academic year string cannot be empty.'),
  isActive: z.boolean().optional(),
});

// Schema for updating an existing academic year.
export const updateAcademicYearSchema = z
  .object({
    yearString: z
      .string()
      .min(1, 'Academic year string cannot be empty.')
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Custom validation: At least one field must be provided for update.
      if (!data.yearString && data.isActive === undefined) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message:
              'No update data provided. At least one field (yearString or isActive) is required.',
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

// Schema for ID parameter validation.
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a UUID.' }),
});
