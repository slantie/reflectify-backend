/**
 * @file src/controllers/upload/facultyData.controller.ts
 * @description Controller layer for handling faculty data upload requests.
 */

import { Request, Response } from 'express';
import { facultyDataUploadService } from '../../services/upload/facultyData.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import { fileUploadSchema } from '../../utils/validators/upload.validation';

export const uploadFacultyData = asyncHandler(
  // Handles the upload and processing of faculty data from an Excel file.
  async (req: Request, res: Response) => {
    const validationResult = fileUploadSchema.safeParse(req);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      throw new AppError(`File upload validation failed: ${errorMessage}`, 400);
    }

    if (!req.file) {
      throw new AppError(
        'No file uploaded or file processing failed by multer.',
        400
      );
    }

    const result = await facultyDataUploadService.processFacultyData(
      req.file.buffer
    );

    res.status(200).json({
      status: 'success',
      message: result.message,
      rowsAffected: result.rowsAffected,
    });
  }
);
