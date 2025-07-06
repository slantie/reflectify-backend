// src/controllers/subjectAllocation/subjectAllocation.controller.ts

import { Request, Response } from 'express';
import { subjectAllocationService } from '../../services/subjectAllocation/subjectAllocation.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import {
  createSubjectAllocationSchema,
  updateSubjectAllocationSchema,
  idParamSchema,
} from '../../utils/validators/subjectAllocation.validation';

/**
 * @description Retrieves all active subject allocations.
 * @route GET /api/v1/subject-allocations
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD, AsstProf, Student)
 */
export const getAllSubjectAllocations = asyncHandler(
  async (_req: Request, res: Response) => {
    const subjectAllocations =
      await subjectAllocationService.getAllSubjectAllocations();

    res.status(200).json({
      status: 'success',
      results: subjectAllocations.length,
      data: {
        subjectAllocations: subjectAllocations,
      },
    });
  }
);

/**
 * @description Retrieves a single subject allocation by ID.
 * @route GET /api/v1/subject-allocations/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD, AsstProf, Student)
 */
export const getSubjectAllocationById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params); // Validate ID

    const subjectAllocation =
      await subjectAllocationService.getSubjectAllocationById(id);

    if (!subjectAllocation) {
      throw new AppError('Subject allocation not found.', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        subjectAllocation: subjectAllocation,
      },
    });
  }
);

/**
 * @description Creates a new subject allocation.
 * @route POST /api/v1/subject-allocations
 * @param {Request} req - Express Request object (expects subject allocation data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const createSubjectAllocation = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData = createSubjectAllocationSchema.parse(req.body); // Validate request body

    const subjectAllocation =
      await subjectAllocationService.createSubjectAllocation(validatedData);

    res.status(201).json({
      status: 'success',
      message: 'Subject allocation created successfully.',
      data: {
        subjectAllocation: subjectAllocation,
      },
    });
  }
);

/**
 * @description Updates an existing subject allocation.
 * @route PATCH /api/v1/subject-allocations/:id
 * @param {Request} req - Express Request object (expects id in params, partial subject allocation data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const updateSubjectAllocation = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params); // Validate ID
    const validatedData = updateSubjectAllocationSchema.parse(req.body); // Validate request body

    const updatedAllocation =
      await subjectAllocationService.updateSubjectAllocation(id, validatedData);

    res.status(200).json({
      status: 'success',
      message: 'Subject allocation updated successfully.',
      data: {
        subjectAllocation: updatedAllocation,
      },
    });
  }
);

/**
 * @description Soft deletes a subject allocation.
 * @route DELETE /api/v1/subject-allocations/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const softDeleteSubjectAllocation = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params); // Validate ID

    await subjectAllocationService.softDeleteSubjectAllocation(id);

    res.status(204).json({
      status: 'success',
      message: 'Subject allocation soft-deleted successfully.',
      data: null, // No content for 204
    });
  }
);
