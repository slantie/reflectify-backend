/**
 * @file src/middlewares/serviceAuth.middleware.ts
 * @description Middleware for service-to-service authentication using API keys
 */

import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/appError';

// Generate a secure API key for your services
const SERVICE_API_KEY =
  process.env.SERVICE_API_KEY || 'your-secure-api-key-here';

/**
 * Middleware to authenticate service-to-service requests using API keys
 * This bypasses normal user authentication for internal service calls
 */
export const serviceAuthMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    throw new AppError(
      'API key is required for service-to-service communication',
      401
    );
  }

  if (apiKey !== SERVICE_API_KEY) {
    throw new AppError('Invalid API key', 401);
  }

  // Set a service user context for internal operations
  (req as any).user = {
    id: 'service-account',
    email: 'service@system.internal',
    designation: 'SUPER_ADMIN',
    isService: true,
    permissions: ['read:all', 'write:all'],
  };

  next();
};
