/**
 * @file src/utils/appError.ts
 * @description Custom error class for handling operational errors with specific HTTP statuses.
 */

class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;

  // Initializes a new operational error.
  constructor(message: string, statusCode: number) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
