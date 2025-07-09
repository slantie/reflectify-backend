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

export const getDivisions = asyncHandler(
  // Retrieves all active divisions, optionally filtered by departmentId and semesterId.
  async (req: Request, res: Response) => {
    const { departmentId, semesterId } = getDivisionsQuerySchema.parse(
      req.query
    );

    const divisions = await divisionService.getAllDivisions(
      departmentId,
      semesterId
    );

    res.status(200).json({
      status: 'success',
      results: divisions.length,
      data: {
        divisions: divisions,
      },
    });
  }
);

export const createDivision = asyncHandler(
  // Creates a new division.
  async (req: Request, res: Response) => {
    const validatedData = createDivisionSchema.parse(req.body);

    const division = await divisionService.createDivision(validatedData);

    res.status(201).json({
      status: 'success',
      message: 'Division created successfully.',
      data: {
        division: division,
      },
    });
  }
);

export const getDivisionById = asyncHandler(
  // Retrieves a single division by ID.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    const division = await divisionService.getDivisionById(id);

    if (!division) {
      throw new AppError('Division not found.', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        division: division,
      },
    });
  }
);

export const updateDivision = asyncHandler(
  // Updates an existing division.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const validatedData = updateDivisionSchema.parse(req.body);

    const division = await divisionService.updateDivision(id, validatedData);

    res.status(200).json({
      status: 'success',
      message: 'Division updated successfully.',
      data: {
        division: division,
      },
    });
  }
);

export const softDeleteDivision = asyncHandler(
  // Soft deletes a division.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    await divisionService.softDeleteDivision(id);

    res.status(204).json({
      status: 'success',
      message: 'Division soft-deleted successfully.',
      data: null,
    });
  }
);

export const batchCreateDivisions = asyncHandler(
  // Performs a batch creation of divisions.
  async (req: Request, res: Response) => {
    const { divisions } = batchCreateDivisionsSchema.parse(req.body);

    const results = await divisionService.batchCreateDivisions(divisions);

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
