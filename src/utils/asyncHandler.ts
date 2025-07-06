/**
 * @file src/utils/asyncHandler.ts
 * @description Utility function to wrap asynchronous Express route handlers.
 * This catches any errors and passes them to the next middleware (error handling middleware).
 */

import { Request, Response, NextFunction } from 'express';

// Define a type for an asynchronous Express route handler
type AsyncFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Wraps an asynchronous Express route handler to catch errors.
 * If an error occurs, it's passed to the next middleware in the chain.
 * @param fn The asynchronous function (controller method) to wrap.
 * @returns An Express RequestHandler that handles promises.
 */
const asyncHandler =
  (fn: AsyncFunction) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default asyncHandler;
