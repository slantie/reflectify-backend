/**
 * @file src/controllers/college/college.controller.ts
 * @description Controller for College operations.
 * Handles request parsing, delegates to CollegeService, and sends responses.
 * Uses asyncHandler for error handling and Zod for validation.
 */

import { Request, Response } from 'express';
import { collegeService } from '../../services/college/college.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import {
  createCollegeSchema,
  updateCollegeSchema,
  batchUpdateCollegeSchema,
  //   idParamSchema, // Keep for consistency, though not used with fixed COLLEGE_ID
} from '../../utils/validators/college.validation';

// Define the fixed COLLEGE_ID here, as it's a specific application-level constant
// that the controller uses to interact with the service.
// const PRIMARY_COLLEGE_ID = 'LDRP-ITR'; // Matches the ID used in the service

/**
 * @description Retrieves all active colleges.
 * @route GET /api/v1/colleges
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const getColleges = asyncHandler(
  async (_req: Request, res: Response) => {
    // Delegate to service layer
    const colleges = await collegeService.getAllColleges();

    // Send success response
    res.status(200).json({
      status: 'success',
      results: colleges.length,
      data: {
        colleges: colleges,
      },
    });
  }
);

/**
 * @description Creates or updates the primary college.
 * @route POST /api/v1/colleges
 * @param {Request} req - Express Request object (expects college data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin, likely Super Admin for initial setup)
 */
export const upsertPrimaryCollege = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request body using Zod
    const validatedData = createCollegeSchema.parse(req.body);

    // 2. Delegate to service layer to create or update the primary college
    const college = await collegeService.upsertPrimaryCollege(validatedData);

    // 3. Send success response
    res.status(201).json({
      status: 'success',
      message: 'College created/updated successfully.',
      data: {
        college: college,
      },
    });
  }
);

/**
 * @description Retrieves the primary college by its fixed ID.
 * @route GET /api/v1/colleges/primary
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const getPrimaryCollege = asyncHandler(
  async (_req: Request, res: Response) => {
    // Delegate to service layer to get the primary college
    const college = await collegeService.getPrimaryCollege();

    // Handle not found scenario
    if (!college) {
      throw new AppError('Primary college not found.', 404);
    }

    // Send success response
    res.status(200).json({
      status: 'success',
      data: {
        college: college,
      },
    });
  }
);

/**
 * @description Updates the primary college.
 * @route PATCH /api/v1/colleges/primary
 * @param {Request} req - Express Request object (expects partial college data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const updatePrimaryCollege = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request body using Zod
    const validatedData = updateCollegeSchema.parse(req.body);

    // 2. Delegate to service layer
    const college = await collegeService.updatePrimaryCollege(validatedData);

    // 3. Send success response
    res.status(200).json({
      status: 'success',
      message: 'College updated successfully.',
      data: {
        college: college,
      },
    });
  }
);

/**
 * @description Soft deletes the primary college.
 * @route DELETE /api/v1/colleges/primary
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin, likely Super Admin)
 */
export const softDeletePrimaryCollege = asyncHandler(
  async (_req: Request, res: Response) => {
    // Delegate to service layer (soft delete)
    await collegeService.softDeletePrimaryCollege();

    // Send success response (204 No Content for successful deletion)
    res.status(204).json({
      status: 'success',
      message: 'College soft-deleted successfully.',
      data: null, // No content for 204
    });
  }
);

/**
 * @description Performs a batch update on the primary college.
 * @route PATCH /api/v1/colleges/primary/batch-update
 * @param {Request} req - Express Request object (expects { updates: Partial<CollegeData> } in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const batchUpdatePrimaryCollege = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request body using Zod
    const { updates } = batchUpdateCollegeSchema.parse(req.body);

    // 2. Delegate to service layer
    const college = await collegeService.batchUpdatePrimaryCollege(updates);

    // 3. Send success response
    res.status(200).json({
      status: 'success',
      message: 'Batch update successful.',
      data: {
        college: college,
      },
    });
  }
);
