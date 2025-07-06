// src/controllers/upload/studentData.controller.ts

import { Request, Response } from 'express';
import { studentDataUploadService } from '../../services/upload/studentData.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import { fileUploadSchema } from '../../utils/validators/upload.validation';

export const uploadStudentData = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Ensure file exists (Multer should populate req.file)
    if (!req.file) {
      throw new AppError(
        'No file uploaded or file processing failed by multer.',
        400
      );
    }

    // 2. Validate req.file against the *inner* schema for the file object
    // fileUploadSchema.shape.file gives us the Zod object schema that describes req.file
    const validationResult = fileUploadSchema.shape.file.safeParse(req.file);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      console.error(
        'Zod validation failed for req.file:',
        validationResult.error
      );
      throw new AppError(`File validation failed: ${errorMessage}`, 400);
    }

    // If validation passes, req.file is confirmed to be valid
    const result = await studentDataUploadService.processStudentData(
      req.file.buffer
    );

    res.status(200).json({
      status: 'success',
      message: result.message,
      rowsAffected: result.rowsAffected,
    });
  }
);
