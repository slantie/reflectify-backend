/**
 * @file src/controllers/student/promotion.controller.ts
 * @description Controller for student promotion operations.
 * Handles request parsing, delegates to PromotionService, and sends responses.
 */

import { Request, Response } from 'express';
import { promotionService } from '../../services/student/promotion.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';

/**
 * @description Promotes all students to the next semester/academic year
 * @route POST /api/v1/students/promote
 * @param {Request} req - Express Request object with body: { targetAcademicYearId: string }
 * @param {Response} res - Express Response object
 * @access Private (Admin only)
 */
export const promoteAllStudents = asyncHandler(
  async (req: Request, res: Response) => {
    console.log('Promotion request received:', req.body);

    const { targetAcademicYearId, yearString } = req.body;

    // Validate that either targetAcademicYearId or yearString is provided
    if (!targetAcademicYearId && !yearString) {
      throw new AppError(
        'Either targetAcademicYearId or yearString is required.',
        400
      );
    }

    if (targetAcademicYearId && yearString) {
      throw new AppError(
        'Provide either targetAcademicYearId or yearString, not both.',
        400
      );
    }

    let promotionResult;

    if (yearString) {
      // Use yearString approach (auto-create academic year if needed)
      if (typeof yearString !== 'string') {
        throw new AppError('Year string must be a string.', 400);
      }
      promotionResult =
        await promotionService.promoteAllStudentsByYear(yearString);
    } else {
      // Use existing targetAcademicYearId approach
      if (typeof targetAcademicYearId !== 'string') {
        throw new AppError('Target academic year ID must be a string.', 400);
      }
      promotionResult =
        await promotionService.promoteAllStudents(targetAcademicYearId);
    }

    // 2. Send success response
    res.status(200).json({
      status: 'success',
      message: `Promotion completed: ${promotionResult.promoted} students promoted, ${promotionResult.graduated} students graduated, ${promotionResult.failed} students failed`,
      data: {
        promotion: promotionResult,
      },
    });
  }
);

/**
 * @description Gets a preview of student promotion without executing it
 * @route GET /api/v1/students/promote/preview
 * @param {Request} req - Express Request object with query: { targetAcademicYearId: string }
 * @param {Response} res - Express Response object
 * @access Private (Admin only)
 */
export const getPromotionPreview = asyncHandler(
  async (req: Request, res: Response) => {
    console.log('Promotion preview request received');
    // Extract targetAcademicYearId from query parameters
    console.log('Query parameters:', req.query);

    const { targetAcademicYearId } = req.query;

    // Validate required fields
    if (!targetAcademicYearId) {
      throw new AppError('Target academic year ID is required.', 400);
    }

    if (typeof targetAcademicYearId !== 'string') {
      throw new AppError('Target academic year ID must be a string.', 400);
    }

    // 1. Delegate to service layer
    const preview =
      await promotionService.getPromotionPreview(targetAcademicYearId);

    // 2. Send success response
    res.status(200).json({
      status: 'success',
      results: preview.byDepartment.length,
      data: {
        preview: preview,
      },
    });
  }
);
