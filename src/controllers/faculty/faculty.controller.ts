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

export const getFaculties = asyncHandler(
  // Retrieves all active faculties.
  async (_req: Request, res: Response) => {
    const faculties = await facultyService.getAllFaculties();

    res.status(200).json({
      status: 'success',
      results: faculties.length,
      data: {
        faculties: faculties,
      },
    });
  }
);

export const createFaculty = asyncHandler(
  // Creates a new faculty.
  async (req: Request, res: Response) => {
    const validatedData = createFacultySchema.parse(req.body);

    const faculty = await facultyService.createFaculty(validatedData);

    res.status(201).json({
      status: 'success',
      message: 'Faculty created successfully.',
      data: {
        faculty: faculty,
      },
    });
  }
);

export const getFacultyById = asyncHandler(
  // Retrieves a single faculty by ID.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    const faculty = await facultyService.getFacultyById(id);

    if (!faculty) {
      throw new AppError('Faculty not found.', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        faculty: faculty,
      },
    });
  }
);

export const updateFaculty = asyncHandler(
  // Updates an existing faculty.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const validatedData = updateFacultySchema.parse(req.body);

    const faculty = await facultyService.updateFaculty(id, validatedData);

    res.status(200).json({
      status: 'success',
      message: 'Faculty updated successfully.',
      data: {
        faculty: faculty,
      },
    });
  }
);

export const softDeleteFaculty = asyncHandler(
  // Soft deletes a faculty.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    await facultyService.softDeleteFaculty(id);

    res.status(204).json({
      status: 'success',
      message: 'Faculty soft-deleted successfully.',
      data: null,
    });
  }
);

export const batchCreateFaculties = asyncHandler(
  // Performs a batch creation of faculties.
  async (req: Request, res: Response) => {
    const { faculties } = batchCreateFacultiesSchema.parse(req.body);

    const results = await facultyService.batchCreateFaculties(faculties);

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

export const getFacultyAbbreviations = asyncHandler(
  // Retrieves faculty abbreviations, optionally filtered by department abbreviation.
  async (req: Request, res: Response) => {
    const { deptAbbr } = deptAbbrParamSchema.parse(req.params);

    const abbreviations =
      await facultyService.getFacultyAbbreviations(deptAbbr);

    res.status(200).json({
      status: 'success',
      results: abbreviations.length,
      data: {
        abbreviations: abbreviations,
      },
    });
  }
);
