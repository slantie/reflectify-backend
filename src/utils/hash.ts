/**
 * @file src/utils/hash.ts
 * @description Utility functions for password hashing using bcrypt.
 */

import bcrypt from 'bcryptjs';

// Hashes a plain text password.
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Compares a plain text password with a hashed password.
export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};
