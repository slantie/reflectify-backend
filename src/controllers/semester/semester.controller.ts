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

export const getSemesters = asyncHandler(
  // Retrieves all active semesters, optionally filtered.
  async (req: Request, res: Response) => {
    const filters = getSemestersQuerySchema.parse(req.query);

    const semesters = await semesterService.getAllSemesters(filters);

    res.status(200).json({
      status: 'success',
      results: semesters.length,
      data: {
        semesters: semesters,
      },
    });
  }
);

export const createSemester = asyncHandler(
  // Creates a new semester.
  async (req: Request, res: Response) => {
    const validatedData = createSemesterSchema.parse(req.body);

    const semester = await semesterService.createSemester(validatedData);

    res.status(201).json({
      status: 'success',
      message: 'Semester created successfully.',
      data: {
        semester: semester,
      },
    });
  }
);

export const getSemesterById = asyncHandler(
  // Retrieves a single semester by ID.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    const semester = await semesterService.getSemesterById(id);

    if (!semester) {
      throw new AppError('Semester not found.', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        semester: semester,
      },
    });
  }
);

export const updateSemester = asyncHandler(
  // Updates an existing semester.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const validatedData = updateSemesterSchema.parse(req.body);

    const semester = await semesterService.updateSemester(id, validatedData);

    res.status(200).json({
      status: 'success',
      message: 'Semester updated successfully.',
      data: {
        semester: semester,
      },
    });
  }
);

export const softDeleteSemester = asyncHandler(
  // Soft deletes a semester.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    await semesterService.softDeleteSemester(id);

    res.status(204).json({
      status: 'success',
      message: 'Semester soft-deleted successfully.',
      data: null,
    });
  }
);

export const batchCreateSemesters = asyncHandler(
  // Performs a batch creation of semesters.
  async (req: Request, res: Response) => {
    const { semesters } = batchCreateSemestersSchema.parse(req.body);

    const results = await semesterService.batchCreateSemesters(semesters);

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

export const getSemestersByDepartment = asyncHandler(
  // Retrieves all active semesters for a specific department.
  async (req: Request, res: Response) => {
    const { id: departmentId } = idParamSchema.parse(req.params);

    const semesters =
      await semesterService.getSemestersByDepartmentId(departmentId);

    res.status(200).json({
      status: 'success',
      results: semesters.length,
      data: {
        semesters: semesters,
      },
    });
  }
);
