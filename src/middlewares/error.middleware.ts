/**
 * @file src/middlewares/error.middleware.ts
 * @description Centralized error handling middleware for the Express application.
 * Catches errors, logs them, and sends standardized error responses to clients.
 */

import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/appError';
import config from '../config'; // Import config for NODE_ENV

/**
 * Handles operational errors (AppError instances) and sends a structured response.
 * @param err The error object.
 * @param req The Express request object.
 * @param res The Express response object.
 * @returns void
 */
const sendErrorProd = (err: AppError, res: Response): void => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err); // Log the error for developers
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

/**
 * Handles all errors in development mode, providing more details.
 * @param err The error object.
 * @param req The Express request object.
 * @param res The Express response object.
 * @returns void
 */
const sendErrorDev = (err: AppError, res: Response): void => {
  // Log the error for developers
  console.error('ERROR 💥', err);

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
    isOperational: err.isOperational,
    // Include Prisma error details if available
    code: (err as any).code,
    meta: (err as any).meta,
  });
};

/**
 * Global error handling middleware.
 * @param err The error object.
 * @param req The Express request object.
 * @param res The Express response object.
 * @param next The Express next middleware function.
 */
const globalErrorHandler = (
  err: any, // Using 'any' here as error can be of various types before being cast to AppError
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Default to 500 Internal Server Error
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err, message: err.message, name: err.name }; // Create a copy of the error

  // Handle specific Prisma errors
  if (error.code === 'P2002') {
    // Unique constraint violation
    const field = error.meta?.target
      ? error.meta.target.join(', ')
      : 'unknown field';
    error = new AppError(
      `Duplicate field value: ${field}. Please use another value!`,
      409
    );
  }
  if (error.code === 'P2025') {
    // Record not found
    error = new AppError(
      `Record not found: ${error.meta?.cause || 'The requested resource does not exist.'}`,
      404
    );
  }
  // Add more Prisma error handlers as needed (e.g., P2003 for foreign key constraint)

  if (config.nodeEnv === 'development') {
    sendErrorDev(error as AppError, res);
  } else if (config.nodeEnv === 'production') {
    sendErrorProd(error as AppError, res);
  }
};

export default globalErrorHandler;
