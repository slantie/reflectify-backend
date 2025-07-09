/**
 * @file src/utils/jwt.ts
 * @description Utility functions for JSON Web Token (JWT) operations.
 */

import jwt from 'jsonwebtoken';
import config from '../config';

// Generates a JWT token for an administrator.
export const generateAuthToken = (
  id: string,
  email: string,
  isSuper: boolean
): string => {
  // Ensures JWT secret is configured.
  if (!config.jwtSecret) {
    throw new Error('Server configuration error: JWT secret missing.');
  }

  return jwt.sign({ id, email, isSuper }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

// Verifies the authenticity and validity of a given JWT token.
export const verifyAuthToken = (token: string): jwt.JwtPayload => {
  // Ensures JWT secret is configured.
  if (!config.jwtSecret) {
    throw new Error('Server configuration error: JWT secret missing.');
  }
  return jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
};
