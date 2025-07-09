/**
 * @file src/controllers/overrideStudents/overrideStudents.controller.ts
 * @description Controller for Override Students operations.
 * Handles request parsing, delegates to OverrideStudentsService, and sends responses.
 * Uses asyncHandler for error handling and Zod for validation.
 */

import { Request, Response } from 'express';
import { overrideStudentsService } from '../../services/overrideStudents/overrideStudents.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import {
  overrideStudentsFileUploadSchema,
  formIdParamSchema,
  getOverrideStudentsQuerySchema,
  updateOverrideStudentSchema,
  overrideStudentIdParamSchema,
} from '../../utils/validators/overrideStudents.validation';

export const uploadOverrideStudents = asyncHandler(
  // Uploads override students for a feedback form from an Excel/CSV file.
  async (req: Request, res: Response) => {
    const { id: formId } = formIdParamSchema.parse(req.params);

    if (!req.file) {
      throw new AppError(
        'No file uploaded or file processing failed by multer.',
        400
      );
    }

    const validationResult =
      overrideStudentsFileUploadSchema.shape.file.safeParse(req.file);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      console.error('File validation failed:', validationResult.error);
      throw new AppError(`File validation failed: ${errorMessage}`, 400);
    }

    const uploadedBy = (req as any).user?.id || 'unknown-admin';

    const result = await overrideStudentsService.uploadOverrideStudents(
      formId,
      req.file.buffer,
      uploadedBy
    );

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        rowsAffected: result.rowsAffected,
        skippedRows: result.skippedRows,
        skippedDetails: result.skippedDetails,
      },
    });
  }
);

export const getOverrideStudents = asyncHandler(
  // Retrieves all override students for a feedback form with pagination.
  async (req: Request, res: Response) => {
    const { id: formId } = formIdParamSchema.parse(req.params);

    const { page, limit } = getOverrideStudentsQuerySchema.parse(req.query);

    const result = await overrideStudentsService.getOverrideStudents(formId, {
      page,
      limit,
    });

    res.status(200).json({
      status: 'success',
      results: result.students.length,
      pagination: result.pagination,
      data: {
        students: result.students,
      },
    });
  }
);

export const updateOverrideStudent = asyncHandler(
  // Updates an override student.
  async (req: Request, res: Response) => {
    const { id: formId } = formIdParamSchema.parse(req.params);

    const { studentId } = overrideStudentIdParamSchema.parse(req.params);

    const updateData = updateOverrideStudentSchema.parse(req.body);

    const updatedStudent = await overrideStudentsService.updateOverrideStudent(
      formId,
      studentId,
      updateData
    );

    res.status(200).json({
      status: 'success',
      message: 'Override student updated successfully.',
      data: {
        student: updatedStudent,
      },
    });
  }
);

export const deleteOverrideStudent = asyncHandler(
  // Deletes an override student (soft delete).
  async (req: Request, res: Response) => {
    const { id: formId } = formIdParamSchema.parse(req.params);

    const { studentId } = overrideStudentIdParamSchema.parse(req.params);

    await overrideStudentsService.deleteOverrideStudent(formId, studentId);

    res.status(204).json({
      status: 'success',
      message: 'Override student deleted successfully.',
      data: null,
    });
  }
);

export const clearOverrideStudents = asyncHandler(
  // Clears all override students for a feedback form.
  async (req: Request, res: Response) => {
    const { id: formId } = formIdParamSchema.parse(req.params);

    const deletedCount =
      await overrideStudentsService.clearOverrideStudents(formId);

    res.status(200).json({
      status: 'success',
      message: `Successfully cleared ${deletedCount} override students.`,
      data: {
        deletedCount,
      },
    });
  }
);

export const getOverrideStudentsCount = asyncHandler(
  // Gets the count of override students for a feedback form.
  async (req: Request, res: Response) => {
    const { id: formId } = formIdParamSchema.parse(req.params);

    const result = await overrideStudentsService.getOverrideStudents(formId, {
      page: 1,
      limit: 1,
    });

    res.status(200).json({
      status: 'success',
      data: {
        count: result.pagination.total,
      },
    });
  }
);

export const getAllOverrideStudents = asyncHandler(
  // Gets all override students for a feedback form without pagination.
  async (req: Request, res: Response) => {
    const { id: formId } = formIdParamSchema.parse(req.params);

    const students =
      await overrideStudentsService.getAllOverrideStudents(formId);

    res.status(200).json({
      status: 'success',
      results: students.length,
      data: {
        students,
      },
    });
  }
);
