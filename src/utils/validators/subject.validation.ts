/**
 * @file src/utils/validators/subject.validation.ts
 * @description Zod schemas for validating subject related requests.
 */

import { z } from 'zod';
import { SubjectType } from '@prisma/client';

// Zod schema for validating the creation of a new subject.
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
  type: z.nativeEnum(SubjectType).default(SubjectType.MANDATORY),
  departmentId: z
    .string()
    .uuid('Invalid department ID format. Must be a UUID.'),
  semesterId: z.string().uuid('Invalid semester ID format. Must be a UUID.'),
});

// Zod schema for validating the update of an existing subject.
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
    isDeleted: z.boolean().optional(),
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

// Zod schema for validating ID parameters in requests.
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a UUID.' }),
});

// Zod schema for validating the semester ID parameter in requests.
export const semesterIdParamSchema = z.object({
  semesterId: z.string().uuid('Invalid semester ID format. Must be a UUID.'),
});

// Zod schema for validating the department abbreviation parameter in requests.
export const departmentAbbreviationParamSchema = z.object({
  deptAbbr: z
    .string()
    .min(1, 'Department abbreviation cannot be empty.')
    .optional(),
});

// Zod schema for validating a batch creation of subjects.
export const batchCreateSubjectsSchema = z.object({
  subjects: z
    .array(createSubjectSchema)
    .min(1, 'At least one subject is required for batch creation.'),
});
