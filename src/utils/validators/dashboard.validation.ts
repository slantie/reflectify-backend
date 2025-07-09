/**
 * @file src/utils/validators/dashboard.validation.ts
 * @description Zod schemas for validating dashboard related requests.
 */

import { z } from 'zod';

// Schema for ID parameter validation.
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a UUID.' }),
});
