// src/utils/validators/studentResponse.validation.ts

import { z } from 'zod';

/**
 * @dev Zod schema for validating the access token parameter in requests.
 * This token is used by students to access and submit forms.
 */
export const accessTokenParamSchema = z.object({
  token: z.string().min(1, 'Access token is required.'),
});

/**
 * @dev Zod schema for validating the structure of student responses submitted.
 * It expects an object where keys are UUIDs (question IDs) and values can be of any type,
 * as response types (rating, text) can vary.
 */
export const submitResponsesBodySchema = z
  .record(
    z
      .string()
      .uuid('Invalid question ID format in response body. Must be a UUID.'),
    z.any(), // Value can be a number (for rating), string (for text), etc.
    {
      invalid_type_error:
        'Responses must be an object where keys are question IDs and values are responses.',
    }
  )
  .refine((data) => Object.keys(data).length > 0, {
    // Corrected: Using .refine() to check for at least one entry
    message: 'At least one response is required for submission.',
  });

/**
 * @dev Zod schema for the complete submit responses request, combining params and body.
 */
export const submitResponsesSchema = z.object({
  params: accessTokenParamSchema,
  body: submitResponsesBodySchema,
});
