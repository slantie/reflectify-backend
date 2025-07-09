/**
 * @file src/utils/validators/faculty.validation.ts
 * @description Zod schemas for validating faculty related requests.
 */

import { z } from 'zod';
import { Designation } from '@prisma/client';

// Schema for creating a new faculty.
export const createFacultySchema = z.object({
  name: z.string().min(1, 'Faculty name is required.'),
  abbreviation: z.string().min(1, 'Abbreviation is required.').optional(),
  email: z.string().email('Invalid email address.'),
  designation: z
    .nativeEnum(Designation, {
      errorMap: (issue, ctx) => {
        if (issue.code === z.ZodIssueCode.invalid_enum_value) {
          return {
            message: `Invalid designation. Expected one of: ${Object.values(Designation).join(', ')}`,
          };
        }
        return { message: ctx.defaultError };
      },
    })
    .default(Designation.AsstProf),
  seatingLocation: z.string().min(1, 'Seating location is required.'),
  image: z.string().url('Invalid image URL format.').optional().nullable(),
  joiningDate: z
    .string()
    .datetime({ message: 'Invalid joining date format. Expected ISO 8601.' })
    .optional(),
  departmentId: z
    .string()
    .uuid('Invalid department ID format. Must be a UUID.'),
});

// Schema for updating an existing faculty.
export const updateFacultySchema = z
  .object({
    name: z.string().min(1, 'Faculty name cannot be empty.').optional(),
    abbreviation: z.string().min(1, 'Abbreviation cannot be empty.').optional(),
    email: z.string().email('Invalid email address.').optional(),
    designation: z
      .nativeEnum(Designation, {
        errorMap: (issue, ctx) => {
          if (issue.code === z.ZodIssueCode.invalid_enum_value) {
            return {
              message: `Invalid designation. Expected one of: ${Object.values(Designation).join(', ')}`,
            };
          }
          return { message: ctx.defaultError };
        },
      })
      .optional(),
    seatingLocation: z
      .string()
      .min(1, 'Seating location cannot be empty.')
      .optional(),
    image: z.string().url('Invalid image URL format.').optional().nullable(),
    joiningDate: z
      .string()
      .datetime({ message: 'Invalid joining date format. Expected ISO 8601.' })
      .optional(),
    departmentId: z.string().uuid('Invalid department ID format.').optional(),
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

// Schema for batch creating faculties.
export const batchCreateFacultiesSchema = z.object({
  faculties: z.array(createFacultySchema),
});

// Schema for ID parameter validation.
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a UUID.' }),
});

// Schema for department abbreviation parameter.
export const deptAbbrParamSchema = z.object({
  deptAbbr: z
    .string()
    .min(1, 'Department abbreviation is required.')
    .optional(),
});
