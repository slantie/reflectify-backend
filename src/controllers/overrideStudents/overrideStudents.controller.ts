// src/controllers/overrideStudents/overrideStudents.controller.ts

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

/**
 * @description Uploads override students for a feedback form from an Excel/CSV file.
 * @route POST /api/v1/feedback-forms/:id/override-students/upload
 * @param {Request} req - Express Request object (expects form ID in params, file in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const uploadOverrideStudents = asyncHandler(
  async (req: Request, res: Response) => {
    // Validate form ID parameter
    const { id: formId } = formIdParamSchema.parse(req.params);

    // Ensure file exists (Multer should populate req.file)
    if (!req.file) {
      throw new AppError(
        'No file uploaded or file processing failed by multer.',
        400
      );
    }

    // Validate file against schema
    const validationResult =
      overrideStudentsFileUploadSchema.shape.file.safeParse(req.file);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      console.error('File validation failed:', validationResult.error);
      throw new AppError(`File validation failed: ${errorMessage}`, 400);
    }

    // Get uploaded by from authenticated user (assuming it's available in req.user)
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

/**
 * @description Retrieves all override students for a feedback form with pagination.
 * @route GET /api/v1/feedback-forms/:id/override-students
 * @param {Request} req - Express Request object (expects form ID in params, pagination in query)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD, AsstProf)
 */
export const getOverrideStudents = asyncHandler(
  async (req: Request, res: Response) => {
    // Validate form ID parameter
    const { id: formId } = formIdParamSchema.parse(req.params);

    // Validate query parameters
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

/**
 * @description Updates an override student.
 * @route PATCH /api/v1/feedback-forms/:id/override-students/:studentId
 * @param {Request} req - Express Request object (expects form ID and student ID in params, update data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const updateOverrideStudent = asyncHandler(
  async (req: Request, res: Response) => {
    // Validate form ID parameter
    const { id: formId } = formIdParamSchema.parse(req.params);

    // Validate student ID parameter
    const { studentId } = overrideStudentIdParamSchema.parse(req.params);

    // Validate update data
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

/**
 * @description Deletes an override student (soft delete).
 * @route DELETE /api/v1/feedback-forms/:id/override-students/:studentId
 * @param {Request} req - Express Request object (expects form ID and student ID in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const deleteOverrideStudent = asyncHandler(
  async (req: Request, res: Response) => {
    // Validate form ID parameter
    const { id: formId } = formIdParamSchema.parse(req.params);

    // Validate student ID parameter
    const { studentId } = overrideStudentIdParamSchema.parse(req.params);

    await overrideStudentsService.deleteOverrideStudent(formId, studentId);

    res.status(204).json({
      status: 'success',
      message: 'Override student deleted successfully.',
      data: null,
    });
  }
);

/**
 * @description Clears all override students for a feedback form.
 * @route DELETE /api/v1/feedback-forms/:id/override-students
 * @param {Request} req - Express Request object (expects form ID in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const clearOverrideStudents = asyncHandler(
  async (req: Request, res: Response) => {
    // Validate form ID parameter
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

/**
 * @description Gets the count of override students for a feedback form.
 * @route GET /api/v1/feedback-forms/:id/override-students/count
 * @param {Request} req - Express Request object (expects form ID in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD, AsstProf)
 */
export const getOverrideStudentsCount = asyncHandler(
  async (req: Request, res: Response) => {
    // Validate form ID parameter
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

/**
 * @description Gets all override students for a feedback form without pagination.
 * @route GET /api/v1/feedback-forms/:id/override-students/all
 * @param {Request} req - Express Request object (expects form ID in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD, AsstProf)
 */
export const getAllOverrideStudents = asyncHandler(
  async (req: Request, res: Response) => {
    // Validate form ID parameter
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
