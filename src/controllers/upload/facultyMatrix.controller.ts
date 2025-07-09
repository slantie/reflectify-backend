/**
 * @file src/controllers/upload/facultyMatrix.controller.ts
 * @description Controller layer for handling faculty matrix upload requests.
 */

import AppError from '../../utils/appError';
import { Request, Response } from 'express';
import { SemesterTypeEnum } from '@prisma/client';
import asyncHandler from '../../utils/asyncHandler';
import { multerFileSchema } from '../../utils/validators/upload.validation';
import { facultyMatrixUploadService } from '../../services/upload/facultyMatrix.service';
import { uploadFacultyMatrixBodySchema } from '../../utils/validators/upload.validation';

export const uploadFacultyMatrix = asyncHandler(
  // Handles the upload and processing of the faculty matrix Excel file.
  async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError(
        'No file uploaded or file processing failed by multer.',
        400
      );
    }

    const fileValidationResult = multerFileSchema.safeParse(req.file);
    if (!fileValidationResult.success) {
      const errorMessage = fileValidationResult.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      console.error(
        'Zod validation failed for req.file in facultyMatrix.controller:',
        fileValidationResult.error
      );
      throw new AppError(`File upload validation failed: ${errorMessage}`, 400);
    }

    const bodyValidationResult = uploadFacultyMatrixBodySchema.safeParse(
      req.body
    );
    if (!bodyValidationResult.success) {
      const errorMessage = bodyValidationResult.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      console.error(
        'Zod validation failed for req.body in facultyMatrix.controller:',
        bodyValidationResult.error
      );
      throw new AppError(
        `Request body validation failed: ${errorMessage}`,
        400
      );
    }

    const { academicYear, semesterRun, deptAbbreviation } =
      bodyValidationResult.data;

    const result = await facultyMatrixUploadService.processFacultyMatrix(
      req.file.buffer,
      academicYear,
      semesterRun as SemesterTypeEnum,
      deptAbbreviation
    );

    const hasBackendErrors =
      result.missingFaculties.length > 0 || result.missingSubjects.length > 0;
    const hasFlaskErrors = result.flaskErrors.length > 0;
    const hasFlaskWarnings = result.flaskWarnings.length > 0;
    const hasAnyIssues = hasBackendErrors || hasFlaskErrors || hasFlaskWarnings;

    let statusMessage = result.message;
    if (!result.flaskSuccess) {
      statusMessage =
        'Faculty matrix processing completed with Flask errors. Please review the issues.';
    } else if (hasAnyIssues) {
      statusMessage =
        'Faculty matrix processing completed with some warnings. Please review the issues.';
    }

    res.status(200).json({
      status: 'success',
      message: statusMessage,
      rowsAffected: result.rowsAffected,
      totalRowsSkippedDueToMissingEntities:
        result.totalRowsSkippedDueToMissingEntities,
      missingFaculties: result.missingFaculties,
      missingSubjects: result.missingSubjects,
      skippedRowsDetails: result.skippedRowsDetails,
      flaskWarnings: result.flaskWarnings,
      flaskErrors: result.flaskErrors,
      flaskSuccess: result.flaskSuccess,
    });
  }
);
