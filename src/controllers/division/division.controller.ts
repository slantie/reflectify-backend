/**
 * @file src/controllers/division/division.controller.ts
 * @description Controller for Division operations.
 * Handles request parsing, delegates to DivisionService, and sends responses.
 * Uses asyncHandler for error handling and Zod for validation.
 */

import { Request, Response } from 'express';
import { divisionService } from '../../services/division/division.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import {
  createDivisionSchema,
  updateDivisionSchema,
  batchCreateDivisionsSchema,
  getDivisionsQuerySchema,
  idParamSchema,
} from '../../utils/validators/division.validation';

/**
 * @description Retrieves all active divisions, optionally filtered by departmentId and semesterId.
 * @route GET /api/v1/divisions
 * @param {Request} req - Express Request object (expects optional departmentId, semesterId in query)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const getDivisions = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate query parameters using Zod
    const { departmentId, semesterId } = getDivisionsQuerySchema.parse(
      req.query
    );

    // 2. Delegate to service layer
    const divisions = await divisionService.getAllDivisions(
      departmentId,
      semesterId
    );

    // 3. Send success response
    res.status(200).json({
      status: 'success',
      results: divisions.length,
      data: {
        divisions: divisions,
      },
    });
  }
);

/**
 * @description Creates a new division.
 * @route POST /api/v1/divisions
 * @param {Request} req - Express Request object (expects division data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const createDivision = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request body using Zod
    const validatedData = createDivisionSchema.parse(req.body);

    // 2. Delegate to service layer
    const division = await divisionService.createDivision(validatedData);

    // 3. Send success response
    res.status(201).json({
      status: 'success',
      message: 'Division created successfully.',
      data: {
        division: division,
      },
    });
  }
);

/**
 * @description Retrieves a single division by ID.
 * @route GET /api/v1/divisions/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const getDivisionById = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters using Zod
    const { id } = idParamSchema.parse(req.params);

    // 2. Delegate to service layer
    const division = await divisionService.getDivisionById(id);

    // 3. Handle not found scenario
    if (!division) {
      throw new AppError('Division not found.', 404);
    }

    // 4. Send success response
    res.status(200).json({
      status: 'success',
      data: {
        division: division,
      },
    });
  }
);

/**
 * @description Updates an existing division.
 * @route PATCH /api/v1/divisions/:id
 * @param {Request} req - Express Request object (expects id in params, partial division data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const updateDivision = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters and body using Zod
    const { id } = idParamSchema.parse(req.params);
    const validatedData = updateDivisionSchema.parse(req.body);

    // 2. Delegate to service layer
    const division = await divisionService.updateDivision(id, validatedData);

    // 3. Send success response
    res.status(200).json({
      status: 'success',
      message: 'Division updated successfully.',
      data: {
        division: division,
      },
    });
  }
);

/**
 * @description Soft deletes a division.
 * @route DELETE /api/v1/divisions/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const softDeleteDivision = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters using Zod
    const { id } = idParamSchema.parse(req.params);

    // 2. Delegate to service layer (soft delete)
    await divisionService.softDeleteDivision(id);

    // 3. Send success response (204 No Content for successful deletion)
    res.status(204).json({
      status: 'success',
      message: 'Division soft-deleted successfully.',
      data: null, // No content for 204
    });
  }
);

/**
 * @description Performs a batch creation of divisions.
 * @route POST /api/v1/divisions/batch
 * @param {Request} req - Express Request object (expects { divisions: DivisionDataInput[] } in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const batchCreateDivisions = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request body using Zod
    const { divisions } = batchCreateDivisionsSchema.parse(req.body);

    // 2. Delegate to service layer
    const results = await divisionService.batchCreateDivisions(divisions);

    // 3. Send success response
    res.status(201).json({
      status: 'success',
      message: 'Divisions batch created successfully.',
      results: results.length,
      data: {
        divisions: results,
      },
    });
  }
);
