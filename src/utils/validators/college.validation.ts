/**
 * @file src/utils/validators/college.validation.ts
 * @description Zod schemas for validating college related requests.
 */

import { z } from 'zod';
import { Prisma } from '@prisma/client'; // Import Prisma to use Prisma.JsonNull

// Schema for the image JSON structure (flexible for now, can be refined)
// This transform ensures that if 'null' is passed, it becomes Prisma.JsonNull for Prisma compatibility.
// If it's an object, it remains an object. If it's undefined, it remains undefined.
const imagesSchema = z
  .union([
    z.record(z.string(), z.any()), // Allows any JSON object (Prisma.JsonObject)
    z.null(), // Explicitly allows 'null' from the input
  ])
  .optional()
  .transform((val) => {
    // If the value is explicitly 'null' from the input, transform it to Prisma.JsonNull
    if (val === null) {
      return Prisma.JsonNull;
    }
    // Otherwise, return the value as is (which could be undefined or a JSON object)
    return val;
  }) as z.ZodType<Prisma.InputJsonValue | undefined>; // Cast to ensure the output type is compatible with Prisma's input

// Schema for creating/upserting a college
export const createCollegeSchema = z.object({
  name: z.string().min(1, 'College name is required.'),
  websiteUrl: z
    .string()
    .url('Invalid website URL format.')
    .min(1, 'Website URL is required.'),
  address: z.string().min(1, 'Address is required.'),
  contactNumber: z.string().min(1, 'Contact number is required.'),
  logo: z.string().min(1, 'Logo URL/path is required.'),
  images: imagesSchema, // Using the transformed images schema
});

// Schema for updating a college (all fields optional)
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
    logo: z.string().min(1, 'Logo URL/path cannot be empty.').optional(),
    images: imagesSchema, // Using the transformed images schema
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

// Schema for batch updating college data (assumes 'updates' key in body)
export const batchUpdateCollegeSchema = z.object({
  updates: updateCollegeSchema, // Reuses the updateCollegeSchema for the 'updates' object
});

// Schema for ID parameter validation (reused from academicYear, but good to have here)
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a UUID.' }),
});
