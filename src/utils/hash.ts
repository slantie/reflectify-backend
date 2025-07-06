/**
 * @file src/utils/hash.ts
 * @description Utility functions for password hashing using bcrypt.
 */

import bcrypt from 'bcryptjs';

/**
 * Hashes a plain text password.
 * @param password - The plain text password to hash.
 * @returns The hashed password string.
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10); // Generate a salt with 10 rounds
  return bcrypt.hash(password, salt);
};

/**
 * Compares a plain text password with a hashed password.
 * @param plainPassword - The plain text password.
 * @param hashedPassword - The hashed password from the database.
 * @returns True if the passwords match, false otherwise.
 */
export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};
