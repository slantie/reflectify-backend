/**
 * @file src/controllers/academicStructure/academicStructure.controller.ts
 * @description Controller for academic structure operations.
 * Handles request parsing, delegates to AcademicStructureService, and sends responses.
 * Uses asyncHandler for error handling.
 */

import { Request, Response } from 'express';
import { academicStructureService } from '../../services/common/academicStructure.service'; // Updated import path
import asyncHandler from '../../utils/asyncHandler';
// import AppError from '../../utils/appError'; // Not directly used here, but good to keep if needed for custom errors

/**
 * @description Retrieves the complete academic structure.
 * @route GET /api/v1/academic-structure
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin/Authenticated User)
 */
export const getAcademicStructure = asyncHandler(
  async (_req: Request, res: Response) => {
    // 1. Delegate to service layer
    const academicStructure =
      await academicStructureService.getAcademicStructure();

    // 2. Send success response
    res.status(200).json({
      status: 'success',
      results: academicStructure.length,
      data: {
        academicStructure: academicStructure,
      },
    });
  }
);
