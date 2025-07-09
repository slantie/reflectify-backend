/**
 * @file src/utils/asyncHandler.ts
 * @description Utility function to wrap asynchronous Express route handlers.
 */

import { Request, Response, NextFunction } from 'express';

type AsyncFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

// Wraps an asynchronous Express route handler to catch errors.
const asyncHandler =
  (fn: AsyncFunction) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default asyncHandler;
