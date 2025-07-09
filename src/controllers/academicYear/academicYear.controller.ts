/**
 * @file src/controllers/academic-year/academic-year.controller.ts
 * @description Controller for Academic Year operations.
 * Handles request parsing, delegates to AcademicYearService, and sends responses.
 * Uses asyncHandler for error handling and Zod for validation.
 */

import { Request, Response } from 'express';
import { academicYearService } from '../../services/academicYear/academicYear.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import {
  createAcademicYearSchema,
  updateAcademicYearSchema,
  idParamSchema,
} from '../../utils/validators/academicYear.validation';

/**
 * @description Creates a new academic year.
 * @route POST /api/v1/academic-years
 * @param {Request} req - Express Request object (expects { yearString: string, startDate?: string, endDate?: string } in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const createAcademicYear = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request body using Zod
    const validatedData = createAcademicYearSchema.parse(req.body);

    // 2. Delegate to service layer
    const academicYear =
      await academicYearService.createAcademicYear(validatedData);

    // 3. Send success response
    res.status(201).json({
      status: 'success',
      message: 'Academic year created successfully.',
      data: {
        academicYear: academicYear,
      },
    });
  }
);

/**
 * @description Retrieves all academic years.
 * @route GET /api/v1/academic-years
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const getAllAcademicYears = asyncHandler(
  async (_req: Request, res: Response) => {
    // 1. Delegate to service layer
    const academicYears = await academicYearService.getAllAcademicYears();

    // 2. Send success response
    res.status(200).json({
      status: 'success',
      results: academicYears.length,
      data: {
        academicYears: academicYears,
      },
    });
  }
);

/**
 * @description Retrieves a single academic year by ID.
 * @route GET /api/v1/academic-years/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const getAcademicYearById = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters using Zod
    const { id } = idParamSchema.parse(req.params);

    // 2. Delegate to service layer
    const academicYear = await academicYearService.getAcademicYearById(id);

    // 3. Handle not found scenario
    if (!academicYear) {
      throw new AppError('Academic year not found.', 404);
    }

    // 4. Send success response
    res.status(200).json({
      status: 'success',
      data: {
        academicYear: academicYear,
      },
    });
  }
);

/**
 * @description Updates an existing academic year.
 * @route PATCH /api/v1/academic-years/:id
 * @param {Request} req - Express Request object (expects id in params, { yearString?: string, startDate?: string, endDate?: string } in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const updateAcademicYear = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters and body using Zod
    const { id } = idParamSchema.parse(req.params);
    const validatedData = updateAcademicYearSchema.parse(req.body);

    // 2. Delegate to service layer
    const academicYear = await academicYearService.updateAcademicYear(
      id,
      validatedData
    );

    // 3. Send success response
    res.status(200).json({
      status: 'success',
      message: 'Academic year updated successfully.',
      data: {
        academicYear: academicYear,
      },
    });
  }
);

/**
 * @description Soft deletes an academic year.
 * @route DELETE /api/v1/academic-years/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const deleteAcademicYear = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters using Zod
    const { id } = idParamSchema.parse(req.params);

    // 2. Delegate to service layer (soft delete)
    await academicYearService.softDeleteAcademicYear(id);

    // 3. Send success response (204 No Content for successful deletion)
    res.status(204).json({
      status: 'success',
      message: 'Academic year soft-deleted successfully.',
      data: null, // No content for 204
    });
  }
);

/**
 * @description Retrieves the currently active academic year.
 * @route GET /api/v1/academic-years/active
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const getActiveAcademicYear = asyncHandler(
  async (_req: Request, res: Response) => {
    // 1. Delegate to service layer
    const activeAcademicYear =
      await academicYearService.getActiveAcademicYear();

    // 2. Handle not found scenario
    if (!activeAcademicYear) {
      return res.status(404).json({
        status: 'fail',
        message: 'No active academic year found.',
        data: null,
      });
    }

    // 3. Send success response
    res.status(200).json({
      status: 'success',
      data: {
        academicYear: activeAcademicYear,
      },
    });
  }
);
