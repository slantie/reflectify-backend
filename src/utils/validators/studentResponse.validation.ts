/**
 * @file src/utils/validators/studentResponse.validation.ts
 * @description Zod schemas for validating student response related requests.
 */

import { z } from 'zod';

// Zod schema for validating the access token parameter in requests.
export const accessTokenParamSchema = z.object({
  token: z.string().min(1, 'Access token is required.'),
});

// Zod schema for validating the structure of student responses submitted.
export const submitResponsesBodySchema = z
  .record(
    z
      .string()
      .uuid('Invalid question ID format in response body. Must be a UUID.'),
    z.any(),
    {
      invalid_type_error:
        'Responses must be an object where keys are question IDs and values are responses.',
    }
  )
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one response is required for submission.',
  });

// Zod schema for the complete submit responses request, combining params and body.
export const submitResponsesSchema = z.object({
  params: accessTokenParamSchema,
  body: submitResponsesBodySchema,
});
