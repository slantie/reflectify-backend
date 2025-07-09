/**
 * @file src/controllers/subjectAllocation/subjectAllocation.controller.ts
 * @description Controller for Subject Allocation operations.
 * Handles request parsing, delegates to SubjectAllocationService, and sends responses.
 * Uses asyncHandler for error handling and Zod for validation.
 */

import { Request, Response } from 'express';
import { subjectAllocationService } from '../../services/subjectAllocation/subjectAllocation.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import {
  createSubjectAllocationSchema,
  updateSubjectAllocationSchema,
  idParamSchema,
} from '../../utils/validators/subjectAllocation.validation';

export const getAllSubjectAllocations = asyncHandler(
  // Retrieves all active subject allocations.
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

export const getSubjectAllocationById = asyncHandler(
  // Retrieves a single subject allocation by ID.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

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

export const createSubjectAllocation = asyncHandler(
  // Creates a new subject allocation.
  async (req: Request, res: Response) => {
    const validatedData = createSubjectAllocationSchema.parse(req.body);

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

export const updateSubjectAllocation = asyncHandler(
  // Updates an existing subject allocation.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const validatedData = updateSubjectAllocationSchema.parse(req.body);

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

export const softDeleteSubjectAllocation = asyncHandler(
  // Soft deletes a subject allocation.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    await subjectAllocationService.softDeleteSubjectAllocation(id);

    res.status(204).json({
      status: 'success',
      message: 'Subject allocation soft-deleted successfully.',
      data: null,
    });
  }
);
