/**
 * @file src/utils/validators/dashboard.validation.ts
 * @description Zod schemas for validating dashboard related requests.
 */

import { z } from 'zod';

// Schema for ID parameter validation (common for many modules)
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a UUID.' }),
});

// No specific schema needed for the /stats endpoint as it doesn't take input.
// This file is created for consistency and future extensibility.
