/**
 * @file src/utils/validators/department.validation.ts
 * @description Zod schemas for validating department related requests.
 */

import { z } from 'zod';

// Schema for creating a new department
export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required.'),
  abbreviation: z.string().min(1, 'Abbreviation is required.').optional(), // Optional, will default to name if not provided
  hodName: z.string().min(1, 'HOD name is required.').optional(), // Optional, will have a default generated
  hodEmail: z.string().email('Invalid HOD email address.').optional(), // Optional, will have a default generated
  collegeId: z
    .string()
    .uuid('Invalid college ID format. Must be a UUID.')
    .optional(), // Optional, as it might be auto-derived for primary college
});

// Schema for updating an existing department
export const updateDepartmentSchema = z
  .object({
    name: z.string().min(1, 'Department name cannot be empty.').optional(),
    abbreviation: z.string().min(1, 'Abbreviation cannot be empty.').optional(),
    hodName: z.string().min(1, 'HOD name cannot be empty.').optional(),
    hodEmail: z.string().email('Invalid HOD email address.').optional(),
    collegeId: z
      .string()
      .uuid('Invalid college ID format. Must be a UUID.')
      .optional(), // Can update collegeId, but be cautious
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

// Schema for batch creating departments
export const batchCreateDepartmentsSchema = z.object({
  departments: z.array(createDepartmentSchema), // Array of createDepartmentSchema objects
});

// Schema for ID parameter validation (reused from academicYear/college)
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a UUID.' }),
});
