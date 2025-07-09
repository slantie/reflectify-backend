/**
 * @file src/utils/validators/semester.validation.ts
 * @description Zod schemas for validating semester related requests.
 */

import { z } from 'zod';
import { SemesterTypeEnum } from '@prisma/client';

// Schema for creating a new semester.
export const createSemesterSchema = z
  .object({
    departmentId: z
      .string()
      .uuid('Invalid department ID format. Must be a UUID.'),
    semesterNumber: z
      .number()
      .int()
      .min(1, 'Semester number must be at least 1.'),
    academicYearId: z
      .string()
      .uuid('Invalid academic year ID format. Must be a UUID.'),
    startDate: z
      .string()
      .datetime({ message: 'Invalid start date format. Expected ISO 8601.' })
      .optional(),
    endDate: z
      .string()
      .datetime({ message: 'Invalid end date format. Expected ISO 8601.' })
      .optional(),
    semesterType: z.nativeEnum(SemesterTypeEnum, {
      errorMap: (issue, ctx) => {
        if (issue.code === z.ZodIssueCode.invalid_enum_value) {
          return {
            message: `Invalid semester type. Expected one of: ${Object.values(SemesterTypeEnum).join(', ')}`,
          };
        }
        return { message: ctx.defaultError };
      },
    }),
  })
  .refine(
    (data) => {
      // Custom validation: If both startDate and endDate are provided, ensure startDate is before endDate.
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

// Schema for updating an existing semester.
export const updateSemesterSchema = z
  .object({
    departmentId: z.string().uuid('Invalid department ID format.').optional(),
    semesterNumber: z
      .number()
      .int()
      .min(1, 'Semester number must be at least 1.')
      .optional(),
    academicYearId: z
      .string()
      .uuid('Invalid academic year ID format.')
      .optional(),
    startDate: z
      .string()
      .datetime({ message: 'Invalid start date format. Expected ISO 8601.' })
      .optional(),
    endDate: z
      .string()
      .datetime({ message: 'Invalid end date format. Expected ISO 8601.' })
      .optional(),
    semesterType: z
      .nativeEnum(SemesterTypeEnum, {
        errorMap: (issue, ctx) => {
          if (issue.code === z.ZodIssueCode.invalid_enum_value) {
            return {
              message: `Invalid semester type. Expected one of: ${Object.values(SemesterTypeEnum).join(', ')}`,
            };
          }
          return { message: ctx.defaultError };
        },
      })
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
  )
  .refine(
    (data) => {
      // Custom validation: If both startDate and endDate are provided, ensure startDate is before endDate.
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

// Schema for query parameters when getting semesters.
export const getSemestersQuerySchema = z.object({
  departmentId: z.string().uuid('Invalid department ID format.').optional(),
  academicYearId: z
    .string()
    .uuid('Invalid academic year ID format.')
    .optional(),
  semesterNumber: z
    .string()
    .regex(/^\d+$/, 'Semester number must be a digit string.')
    .transform(Number)
    .optional(),
  semesterType: z.nativeEnum(SemesterTypeEnum).optional(),
});

// Schema for batch creating semesters.
export const batchCreateSemestersSchema = z.object({
  semesters: z.array(createSemesterSchema),
});

// Schema for ID parameter validation.
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a UUID.' }),
});
