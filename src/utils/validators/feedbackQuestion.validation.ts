// src/utils/validators/feedbackQuestion.validation.ts

import { z } from 'zod';
// import { LectureType } from '@prisma/client'; // Assuming LectureType is available, though not directly used here, good for context
// Assuming QuestionType is a string in schema, if it's an enum, import it similarly
// import { QuestionType } from '@prisma/client';

/**
 * @dev Zod schema for validating the creation of a new Question Category.
 */
export const createQuestionCategorySchema = z.object({
  categoryName: z.string().min(1, 'Category name is required.'),
  description: z.string().min(1, 'Description is required.'),
});

/**
 * @dev Zod schema for validating the update of an existing Question Category.
 * All fields are optional, allowing for partial updates.
 */
export const updateQuestionCategorySchema = createQuestionCategorySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message:
      'No update data provided. At least one field is required for update.',
    path: [],
  });

/**
 * @dev Zod schema for validating the creation of a new Feedback Question.
 * 'batch' is optional and defaults to "None" in schema.
 */
export const createFeedbackQuestionSchema = z.object({
  formId: z.string().uuid('Invalid form ID format. Must be a UUID.'),
  categoryId: z.string().uuid('Invalid category ID format. Must be a UUID.'),
  facultyId: z.string().uuid('Invalid faculty ID format. Must be a UUID.'),
  subjectId: z.string().uuid('Invalid subject ID format. Must be a UUID.'),
  batch: z.string().optional().default('None'), // Matches schema default
  text: z.string().min(1, 'Question text is required.'),
  type: z.string().min(1, 'Question type is required.'), // Assuming 'type' is a string, e.g., "TEXT", "RATING", "MCQ"
  isRequired: z.boolean().optional().default(true),
  displayOrder: z
    .number()
    .int()
    .min(0, 'Display order must be a non-negative integer.'),
});

/**
 * @dev Intermediate schema for partial Feedback Question data, used for updates and batch updates.
 * This is a plain ZodObject, allowing it to be merged.
 */
export const partialFeedbackQuestionDataSchema =
  createFeedbackQuestionSchema.partial();

/**
 * @dev Zod schema for validating the update of an existing Feedback Question.
 * All fields are optional, allowing for partial updates.
 */
export const updateFeedbackQuestionSchema =
  partialFeedbackQuestionDataSchema.refine(
    (data) => Object.keys(data).length > 0,
    {
      message:
        'No update data provided. At least one field is required for update.',
      path: [],
    }
  );

/**
 * @dev Zod schema for validating a batch update of Feedback Questions.
 * Expects an array of objects, each with an 'id' and partial update data.
 */
export const batchUpdateFeedbackQuestionsSchema = z.object({
  questions: z
    .array(
      z
        .object({
          id: z.string().uuid('Invalid question ID format for batch update.'),
        })
        .merge(partialFeedbackQuestionDataSchema) // Merge with the plain ZodObject
    )
    .min(1, 'At least one question is required for batch update.'),
});

/**
 * @dev Zod schema for validating ID parameters in requests (e.g., for /:id).
 * Ensures the ID is a valid UUID format.
 */
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a UUID.' }),
});

/**
 * @dev Zod schema for validating form ID parameter in requests (e.g., for /form/:formId/questions).
 * Ensures the formId is a valid UUID format.
 */
export const formIdParamSchema = z.object({
  formId: z
    .string()
    .uuid({ message: 'Invalid form ID format. Must be a UUID.' }),
});
