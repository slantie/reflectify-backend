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
} from '../../utils/validators/college.validation';

export const getColleges = asyncHandler(
  // Retrieves all active colleges.
  async (_req: Request, res: Response) => {
    const colleges = await collegeService.getAllColleges();

    res.status(200).json({
      status: 'success',
      results: colleges.length,
      data: {
        colleges: colleges,
      },
    });
  }
);

export const upsertPrimaryCollege = asyncHandler(
  // Creates or updates the primary college.
  async (req: Request, res: Response) => {
    const validatedData = createCollegeSchema.parse(req.body);

    const college = await collegeService.upsertPrimaryCollege(validatedData);

    res.status(201).json({
      status: 'success',
      message: 'College created/updated successfully.',
      data: {
        college: college,
      },
    });
  }
);

export const getPrimaryCollege = asyncHandler(
  // Retrieves the primary college by its fixed ID.
  async (_req: Request, res: Response) => {
    const college = await collegeService.getPrimaryCollege();

    if (!college) {
      throw new AppError('Primary college not found.', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        college: college,
      },
    });
  }
);

export const updatePrimaryCollege = asyncHandler(
  // Updates the primary college.
  async (req: Request, res: Response) => {
    const validatedData = updateCollegeSchema.parse(req.body);

    const college = await collegeService.updatePrimaryCollege(validatedData);

    res.status(200).json({
      status: 'success',
      message: 'College updated successfully.',
      data: {
        college: college,
      },
    });
  }
);

export const softDeletePrimaryCollege = asyncHandler(
  // Soft deletes the primary college.
  async (_req: Request, res: Response) => {
    await collegeService.softDeletePrimaryCollege();

    res.status(204).json({
      status: 'success',
      message: 'College soft-deleted successfully.',
      data: null,
    });
  }
);

export const batchUpdatePrimaryCollege = asyncHandler(
  // Performs a batch update on the primary college.
  async (req: Request, res: Response) => {
    const { updates } = batchUpdateCollegeSchema.parse(req.body);

    const college = await collegeService.batchUpdatePrimaryCollege(updates);

    res.status(200).json({
      status: 'success',
      message: 'Batch update successful.',
      data: {
        college: college,
      },
    });
  }
);
