/**
 * @file src/utils/validators/auth.validation.ts
 * @description Zod schemas for validating authentication related requests.
 */

import { z } from 'zod';

// Common password schema for reusability.
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .max(100, 'Password cannot exceed 100 characters.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.')
  .regex(
    /[^a-zA-Z0-9]/,
    'Password must contain at least one special character.'
  );

// Schema for admin registration.
export const registerAdminSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.'),
  password: passwordSchema,
  designation: z.string().min(1, 'Designation is required.'),
});

// Schema for admin login.
export const loginAdminSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

// Schema for updating password.
export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: passwordSchema,
});
