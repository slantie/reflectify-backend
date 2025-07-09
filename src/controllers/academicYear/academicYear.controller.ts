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

export const createAcademicYear = asyncHandler(
  // Creates a new academic year.
  async (req: Request, res: Response) => {
    const validatedData = createAcademicYearSchema.parse(req.body);

    const academicYear =
      await academicYearService.createAcademicYear(validatedData);

    res.status(201).json({
      status: 'success',
      message: 'Academic year created successfully.',
      data: {
        academicYear: academicYear,
      },
    });
  }
);

export const getAllAcademicYears = asyncHandler(
  // Retrieves all academic years.
  async (_req: Request, res: Response) => {
    const academicYears = await academicYearService.getAllAcademicYears();

    res.status(200).json({
      status: 'success',
      results: academicYears.length,
      data: {
        academicYears: academicYears,
      },
    });
  }
);

export const getAcademicYearById = asyncHandler(
  // Retrieves a single academic year by ID.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    const academicYear = await academicYearService.getAcademicYearById(id);

    if (!academicYear) {
      throw new AppError('Academic year not found.', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        academicYear: academicYear,
      },
    });
  }
);

export const updateAcademicYear = asyncHandler(
  // Updates an existing academic year.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const validatedData = updateAcademicYearSchema.parse(req.body);

    const academicYear = await academicYearService.updateAcademicYear(
      id,
      validatedData
    );

    res.status(200).json({
      status: 'success',
      message: 'Academic year updated successfully.',
      data: {
        academicYear: academicYear,
      },
    });
  }
);

export const deleteAcademicYear = asyncHandler(
  // Soft deletes an academic year.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    await academicYearService.softDeleteAcademicYear(id);

    res.status(204).json({
      status: 'success',
      message: 'Academic year soft-deleted successfully.',
      data: null,
    });
  }
);

export const getActiveAcademicYear = asyncHandler(
  // Retrieves the currently active academic year.
  async (_req: Request, res: Response) => {
    const activeAcademicYear =
      await academicYearService.getActiveAcademicYear();

    if (!activeAcademicYear) {
      return res.status(404).json({
        status: 'fail',
        message: 'No active academic year found.',
        data: null,
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        academicYear: activeAcademicYear,
      },
    });
  }
);
