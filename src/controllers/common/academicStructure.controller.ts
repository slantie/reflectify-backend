/**
 * @file src/controllers/academicStructure/academicStructure.controller.ts
 * @description Controller for academic structure operations.
 * Handles request parsing, delegates to AcademicStructureService, and sends responses.
 * Uses asyncHandler for error handling.
 */

import { Request, Response } from 'express';
import { academicStructureService } from '../../services/common/academicStructure.service';
import asyncHandler from '../../utils/asyncHandler';

export const getAcademicStructure = asyncHandler(
  // Retrieves the complete academic structure.
  async (req: Request, res: Response) => {
    const { academicYearId } = req.query;

    const academicStructure = academicYearId
      ? await academicStructureService.getAcademicStructureByYear(
          academicYearId as string
        )
      : await academicStructureService.getAcademicStructure();

    res.status(200).json({
      status: 'success',
      results: academicStructure.length,
      data: {
        academicStructure: academicStructure,
      },
    });
  }
);
