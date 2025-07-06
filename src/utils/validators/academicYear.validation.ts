/**
 * @file src/utils/validators/academicYear.validation.ts
 * @description Zod schemas for validating academic year related requests.
 */

import { z } from 'zod';

// Schema for creating a new academic year
export const createAcademicYearSchema = z
  .object({
    yearString: z
      .string({
        required_error: 'Academic year string is required.',
      })
      .min(1, 'Academic year string cannot be empty.'),
    startDate: z
      .string()
      .datetime({ message: 'Invalid start date format. Expected ISO 8601.' })
      .optional(),
    endDate: z
      .string()
      .datetime({ message: 'Invalid end date format. Expected ISO 8601.' })
      .optional(),
  })
  .refine(
    (data) => {
      // Custom validation: If both startDate and endDate are provided, ensure startDate is before endDate
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) < new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'Start date must be before end date.',
      path: ['startDate'], // Attach error to startDate field
    }
  );

// Schema for updating an existing academic year
export const updateAcademicYearSchema = z
  .object({
    yearString: z
      .string()
      .min(1, 'Academic year string cannot be empty.')
      .optional(),
    startDate: z
      .string()
      .datetime({ message: 'Invalid start date format. Expected ISO 8601.' })
      .optional(),
    endDate: z
      .string()
      .datetime({ message: 'Invalid end date format. Expected ISO 8601.' })
      .optional(),
  })
  .refine(
    (data) => {
      // Custom validation: At least one field must be provided for update
      if (!data.yearString && !data.startDate && !data.endDate) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message:
              'No update data provided. At least one field (yearString, startDate, or endDate) is required.',
            path: [], // Global error
          },
        ]);
      }
      return true;
    },
    {
      message: 'No update data provided.',
      path: [],
    }
  )
  .refine(
    (data) => {
      // Custom validation: If both startDate and endDate are provided, ensure startDate is before endDate
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) < new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'Start date must be before end date.',
      path: ['startDate'],
    }
  );

// Schema for ID parameter validation
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a UUID.' }),
});
