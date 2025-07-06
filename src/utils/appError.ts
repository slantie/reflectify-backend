/**
 * @file src/utils/appError.ts
 * @description Custom error class for handling operational errors in the application.
 * This allows for standardized error responses with specific HTTP statuses.
 */

class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message); // Call the parent Error constructor

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'; // 'fail' for 4xx, 'error' for 5xx
    this.isOperational = true; // Mark as operational error (expected errors)

    // Capture the stack trace, excluding the constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
