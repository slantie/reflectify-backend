/**
 * @file src/utils/jwt.ts
 * @description Utility functions for JSON Web Token (JWT) operations.
 */

import jwt, { SignOptions } from 'jsonwebtoken'; // Import SignOptions
import config from '../config';

// Generates a JWT token for an administrator.
export const generateAuthToken = (
  id: string,
  email: string,
  isSuper: boolean
): string => {
  if (!config.jwtSecret) {
    throw new Error('Server configuration error: JWT secret missing.');
  }
  const payload = { id, email, isSuper };
  const secret: jwt.Secret = config.jwtSecret;
  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, secret, options);
};

// Verifies the authenticity and validity of a given JWT token.
export const verifyAuthToken = (token: string): jwt.JwtPayload => {
  // Ensures JWT secret is configured.
  if (!config.jwtSecret) {
    throw new Error('Server configuration error: JWT secret missing.');
  }
  return jwt.verify(token, config.jwtSecret as jwt.Secret) as jwt.JwtPayload;
};
