/**
 * @file src/utils/validators/college.validation.ts
 * @description Zod schemas for validating college related requests.
 */

import { z } from 'zod';

// Schema for creating/upserting a college.
export const createCollegeSchema = z.object({
  name: z.string().min(1, 'College name is required.'),
  websiteUrl: z
    .string()
    .url('Invalid website URL format.')
    .min(1, 'Website URL is required.'),
  address: z.string().min(1, 'Address is required.'),
  contactNumber: z.string().min(1, 'Contact number is required.'),
});

// Schema for updating a college (all fields optional).
export const updateCollegeSchema = z
  .object({
    name: z.string().min(1, 'College name cannot be empty.').optional(),
    websiteUrl: z
      .string()
      .url('Invalid website URL format.')
      .min(1, 'Website URL cannot be empty.')
      .optional(),
    address: z.string().min(1, 'Address cannot be empty.').optional(),
    contactNumber: z
      .string()
      .min(1, 'Contact number cannot be empty.')
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

// Schema for batch updating college data.
export const batchUpdateCollegeSchema = z.object({
  updates: updateCollegeSchema,
});

// Schema for ID parameter validation.
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a UUID.' }),
});
