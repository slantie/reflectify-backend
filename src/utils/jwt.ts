/**
 * @file src/utils/jwt.ts
 * @description Utility functions for JSON Web Token (JWT) operations.
 * Handles token generation and verification.
 */

import jwt from 'jsonwebtoken';
import config from '../config'; // Import application configuration

/**
 * Generates a JWT token for an admin.
 * @param id - The ID of the admin.
 * @param email - The email of the admin.
 * @param isSuper - Boolean indicating if the admin is a super admin.
 * @returns The generated JWT token string.
 * @throws Error if JWT_SECRET is not configured.
 */
export const generateAuthToken = (
  id: string,
  email: string,
  isSuper: boolean
): string => {
  // Ensure JWT_SECRET is defined in environment variables via config
  if (!config.jwtSecret) {
    // In a production environment, this should ideally be caught during app startup.
    // Throwing an error here ensures the issue is visible early.
    throw new Error('Server configuration error: JWT secret missing.');
  }

  return jwt.sign({ id, email, isSuper }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn, // Token expiry from config (e.g., '1d', '30d')
  });
};

/**
 * Verifies a JWT token.
 * @param token - The JWT token string to verify.
 * @returns The decoded payload if verification is successful.
 * @throws JsonWebTokenError if the token is invalid or expired.
 */
export const verifyAuthToken = (token: string): jwt.JwtPayload => {
  if (!config.jwtSecret) {
    throw new Error('Server configuration error: JWT secret missing.');
  }
  // jwt.verify returns the payload if valid, throws an error otherwise
  return jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
};
