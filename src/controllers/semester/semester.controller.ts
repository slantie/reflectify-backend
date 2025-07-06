/**
 * @file src/controllers/semester/semester.controller.ts
 * @description Controller for Semester operations.
 * Handles request parsing, delegates to SemesterService, and sends responses.
 * Uses asyncHandler for error handling and Zod for validation.
 */

import { Request, Response } from 'express';
import { semesterService } from '../../services/semester/semester.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import {
  createSemesterSchema,
  updateSemesterSchema,
  batchCreateSemestersSchema,
  getSemestersQuerySchema,
  idParamSchema,
} from '../../utils/validators/semester.validation';

/**
 * @description Retrieves all active semesters, optionally filtered.
 * @route GET /api/v1/semesters
 * @param {Request} req - Express Request object (expects optional filters in query)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const getSemesters = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate query parameters using Zod
    const filters = getSemestersQuerySchema.parse(req.query);

    // 2. Delegate to service layer
    const semesters = await semesterService.getAllSemesters(filters);

    // 3. Send success response
    res.status(200).json({
      status: 'success',
      results: semesters.length,
      data: {
        semesters: semesters,
      },
    });
  }
);

/**
 * @description Creates a new semester.
 * @route POST /api/v1/semesters
 * @param {Request} req - Express Request object (expects semester data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const createSemester = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request body using Zod
    const validatedData = createSemesterSchema.parse(req.body);

    // 2. Delegate to service layer
    const semester = await semesterService.createSemester(validatedData);

    // 3. Send success response
    res.status(201).json({
      status: 'success',
      message: 'Semester created successfully.',
      data: {
        semester: semester,
      },
    });
  }
);

/**
 * @description Retrieves a single semester by ID.
 * @route GET /api/v1/semesters/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const getSemesterById = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters using Zod
    const { id } = idParamSchema.parse(req.params);

    // 2. Delegate to service layer
    const semester = await semesterService.getSemesterById(id);

    // 3. Handle not found scenario
    if (!semester) {
      throw new AppError('Semester not found.', 404);
    }

    // 4. Send success response
    res.status(200).json({
      status: 'success',
      data: {
        semester: semester,
      },
    });
  }
);

/**
 * @description Updates an existing semester.
 * @route PATCH /api/v1/semesters/:id
 * @param {Request} req - Express Request object (expects id in params, partial semester data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const updateSemester = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters and body using Zod
    const { id } = idParamSchema.parse(req.params);
    const validatedData = updateSemesterSchema.parse(req.body);

    // 2. Delegate to service layer
    const semester = await semesterService.updateSemester(id, validatedData);

    // 3. Send success response
    res.status(200).json({
      status: 'success',
      message: 'Semester updated successfully.',
      data: {
        semester: semester,
      },
    });
  }
);

/**
 * @description Soft deletes a semester.
 * @route DELETE /api/v1/semesters/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const softDeleteSemester = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters using Zod
    const { id } = idParamSchema.parse(req.params);

    // 2. Delegate to service layer (soft delete)
    await semesterService.softDeleteSemester(id);

    // 3. Send success response (204 No Content for successful deletion)
    res.status(204).json({
      status: 'success',
      message: 'Semester soft-deleted successfully.',
      data: null, // No content for 204
    });
  }
);

/**
 * @description Performs a batch creation of semesters.
 * @route POST /api/v1/semesters/batch
 * @param {Request} req - Express Request object (expects { semesters: SemesterDataInput[] } in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const batchCreateSemesters = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request body using Zod
    const { semesters } = batchCreateSemestersSchema.parse(req.body);

    // 2. Delegate to service layer
    const results = await semesterService.batchCreateSemesters(semesters);

    // 3. Send success response
    res.status(201).json({
      status: 'success',
      message: 'Semesters batch created successfully.',
      results: results.length,
      data: {
        semesters: results,
      },
    });
  }
);

/**
 * @description Retrieves all active semesters for a specific department.
 * @route GET /api/v1/semesters/dept/:id
 * @param {Request} req - Express Request object (expects departmentId in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const getSemestersByDepartment = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters using Zod (using idParamSchema for departmentId)
    const { id: departmentId } = idParamSchema.parse(req.params);

    // 2. Delegate to service layer
    const semesters =
      await semesterService.getSemestersByDepartmentId(departmentId);

    // 3. Send success response
    res.status(200).json({
      status: 'success',
      results: semesters.length,
      data: {
        semesters: semesters,
      },
    });
  }
);
