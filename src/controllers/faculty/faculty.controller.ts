/**
 * @file src/controllers/faculty/faculty.controller.ts
 * @description Controller for Faculty operations.
 * Handles request parsing, delegates to FacultyService, and sends responses.
 * Uses asyncHandler for error handling and Zod for validation.
 */

import { Request, Response } from 'express';
import { facultyService } from '../../services/faculty/faculty.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import {
  createFacultySchema,
  updateFacultySchema,
  batchCreateFacultiesSchema,
  idParamSchema,
  deptAbbrParamSchema,
} from '../../utils/validators/faculty.validation';

/**
 * @description Retrieves all active faculties.
 * @route GET /api/v1/faculties
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const getFaculties = asyncHandler(
  async (_req: Request, res: Response) => {
    // Delegate to service layer
    const faculties = await facultyService.getAllFaculties();

    // Send success response
    res.status(200).json({
      status: 'success',
      results: faculties.length,
      data: {
        faculties: faculties,
      },
    });
  }
);

/**
 * @description Creates a new faculty.
 * @route POST /api/v1/faculties
 * @param {Request} req - Express Request object (expects faculty data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const createFaculty = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request body using Zod
    const validatedData = createFacultySchema.parse(req.body);

    // 2. Delegate to service layer
    const faculty = await facultyService.createFaculty(validatedData);

    // 3. Send success response
    res.status(201).json({
      status: 'success',
      message: 'Faculty created successfully.',
      data: {
        faculty: faculty,
      },
    });
  }
);

/**
 * @description Retrieves a single faculty by ID.
 * @route GET /api/v1/faculties/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const getFacultyById = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters using Zod
    const { id } = idParamSchema.parse(req.params);

    // 2. Delegate to service layer
    const faculty = await facultyService.getFacultyById(id);

    // 3. Handle not found scenario
    if (!faculty) {
      throw new AppError('Faculty not found.', 404);
    }

    // 4. Send success response
    res.status(200).json({
      status: 'success',
      data: {
        faculty: faculty,
      },
    });
  }
);

/**
 * @description Updates an existing faculty.
 * @route PATCH /api/v1/faculties/:id
 * @param {Request} req - Express Request object (expects id in params, partial faculty data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const updateFaculty = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters and body using Zod
    const { id } = idParamSchema.parse(req.params);
    const validatedData = updateFacultySchema.parse(req.body);

    // 2. Delegate to service layer
    const faculty = await facultyService.updateFaculty(id, validatedData);

    // 3. Send success response
    res.status(200).json({
      status: 'success',
      message: 'Faculty updated successfully.',
      data: {
        faculty: faculty,
      },
    });
  }
);

/**
 * @description Soft deletes a faculty.
 * @route DELETE /api/v1/faculties/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const softDeleteFaculty = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters using Zod
    const { id } = idParamSchema.parse(req.params);

    // 2. Delegate to service layer (soft delete)
    await facultyService.softDeleteFaculty(id);

    // 3. Send success response (204 No Content for successful deletion)
    res.status(204).json({
      status: 'success',
      message: 'Faculty soft-deleted successfully.',
      data: null, // No content for 204
    });
  }
);

/**
 * @description Performs a batch creation of faculties.
 * @route POST /api/v1/faculties/batch
 * @param {Request} req - Express Request object (expects { faculties: FacultyDataInput[] } in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const batchCreateFaculties = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request body using Zod
    const { faculties } = batchCreateFacultiesSchema.parse(req.body);

    // 2. Delegate to service layer
    const results = await facultyService.batchCreateFaculties(faculties);

    // 3. Send success response
    res.status(201).json({
      status: 'success',
      message: 'Faculties batch created successfully.',
      results: results.length,
      data: {
        faculties: results,
      },
    });
  }
);

/**
 * @description Retrieves faculty abbreviations, optionally filtered by department abbreviation.
 * @route GET /api/v1/faculties/abbreviations/:deptAbbr?
 * @param {Request} req - Express Request object (expects optional deptAbbr in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const getFacultyAbbreviations = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters using Zod
    const { deptAbbr } = deptAbbrParamSchema.parse(req.params);

    // 2. Delegate to service layer
    const abbreviations =
      await facultyService.getFacultyAbbreviations(deptAbbr);

    // 3. Send success response
    res.status(200).json({
      status: 'success',
      results: abbreviations.length,
      data: {
        abbreviations: abbreviations,
      },
    });
  }
);
