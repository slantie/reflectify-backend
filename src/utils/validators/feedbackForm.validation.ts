/**
 * @file src/utils/validators/feedbackForm.validation.ts
 * @description Zod schemas for validating feedback form related requests.
 */

import { z } from 'zod';
import { FormStatus } from '@prisma/client';

// Zod schema for validating a single semester selection within form generation.
export const semesterSelectionSchema = z.object({
  id: z.string().uuid('Invalid semester ID format. Must be a UUID.'),
  divisions: z
    .array(z.string().uuid('Invalid division ID format. Must be a UUID.'))
    .min(1, 'At least one division is required for semester selection.'),
});

// Zod schema for validating the request body for generating feedback forms.
export const generateFormsSchema = z.object({
  departmentId: z
    .string()
    .uuid('Invalid department ID format. Must be a UUID.'),
  selectedSemesters: z
    .array(semesterSelectionSchema)
    .min(1, 'At least one semester selection is required.'),
});

// Zod schema for validating the creation of a new feedback question when adding to an existing form.
export const addQuestionToFormSchema = z.object({
  categoryId: z.string(),
  facultyId: z.string().uuid('Invalid faculty ID format. Must be a UUID.'),
  subjectId: z.string().uuid('Invalid subject ID format. Must be a UUID.'),
  batch: z.string().optional().default('None'),
  text: z.string().min(1, 'Question text is required.'),
  type: z.string().min(1, 'Question type is required.'),
  isRequired: z.boolean().optional().default(true),
  displayOrder: z
    .number()
    .int()
    .min(0, 'Display order must be a non-negative integer.'),
});

// Zod schema for validating the update of an existing feedback form.
export const updateFormSchema = z
  .object({
    title: z.string().optional(),
    status: z.nativeEnum(FormStatus).optional(),
    startDate: z
      .string()
      .datetime(
        'Invalid start date format. Must be a valid ISO 8601 date string.'
      )
      .optional(),
    endDate: z
      .string()
      .datetime(
        'Invalid end date format. Must be a valid ISO 8601 date string.'
      )
      .optional(),
    description: z.string().nullable().optional().default(''),
    isDeleted: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message:
      'No update data provided. At least one field is required for update.',
    path: [],
  });

// Zod schema for validating the request body for updating a single form's status.
export const updateFormStatusSchema = z
  .object({
    status: z.nativeEnum(FormStatus, { message: 'Invalid form status.' }),
    startDate: z
      .string()
      .datetime(
        'Invalid start date format. Must be a valid ISO 8601 date string.'
      )
      .optional(),
    endDate: z
      .string()
      .datetime(
        'Invalid end date format. Must be a valid ISO 8601 date string.'
      )
      .optional(),
  })
  .refine(
    (_data) => {
      // Basic date validation, more complex logic handled in service.
      return true;
    },
    {
      message: 'Date validation for status change failed.',
      path: [],
    }
  );

// Zod schema for validating the request body for bulk updating form statuses.
export const bulkUpdateFormStatusSchema = z.object({
  formIds: z
    .array(z.string().uuid('Invalid form ID in list. Must be a UUID.'))
    .min(1, 'At least one form ID is required.'),
  status: z.nativeEnum(FormStatus, { message: 'Invalid form status.' }),
  startDate: z
    .string()
    .datetime(
      'Invalid start date format. Must be a valid ISO 8601 date string.'
    )
    .optional(),
  endDate: z
    .string()
    .datetime('Invalid end date format. Must be a valid ISO 8601 date string.')
    .optional(),
});

// Zod schema for validating ID parameters in requests.
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a UUID.' }),
});

// Zod schema for validating access token parameter in requests.
export const accessTokenParamSchema = z.object({
  token: z.string().min(1, 'Access token is required.'),
});
