/**
 * @file src/utils/validators/feedbackQuestion.validation.ts
 * @description Zod schemas for validating feedback question related requests.
 */

import { z } from 'zod';

// Zod schema for validating the creation of a new Question Category.
export const createQuestionCategorySchema = z.object({
  categoryName: z.string().min(1, 'Category name is required.'),
  description: z.string().min(1, 'Description is required.'),
});

// Zod schema for validating the update of an existing Question Category.
export const updateQuestionCategorySchema = createQuestionCategorySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message:
      'No update data provided. At least one field is required for update.',
    path: [],
  });

// Zod schema for validating the creation of a new Feedback Question.
export const createFeedbackQuestionSchema = z.object({
  formId: z.string().uuid('Invalid form ID format. Must be a UUID.'),
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

// Intermediate schema for partial Feedback Question data.
export const partialFeedbackQuestionDataSchema =
  createFeedbackQuestionSchema.partial();

// Zod schema for validating the update of an existing Feedback Question.
export const updateFeedbackQuestionSchema =
  partialFeedbackQuestionDataSchema.refine(
    (data) => Object.keys(data).length > 0,
    {
      message:
        'No update data provided. At least one field is required for update.',
      path: [],
    }
  );

// Zod schema for validating a batch update of Feedback Questions.
export const batchUpdateFeedbackQuestionsSchema = z.object({
  questions: z
    .array(
      z
        .object({
          id: z.string().uuid('Invalid question ID format for batch update.'),
        })
        .merge(partialFeedbackQuestionDataSchema)
    )
    .min(1, 'At least one question is required for batch update.'),
});

// Zod schema for validating ID parameters in requests.
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a UUID.' }),
});

// Zod schema for validating form ID parameter in requests.
export const formIdParamSchema = z.object({
  formId: z
    .string()
    .uuid({ message: 'Invalid form ID format. Must be a UUID.' }),
});
