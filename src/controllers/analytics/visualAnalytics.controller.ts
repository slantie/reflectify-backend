/**
 * @file src/controllers/visualAnalytics/visualAnalytics.controller.ts
 * @description Controller for visual analytics operations (chart data).
 * Handles request parsing, delegates to VisualAnalyticsService, and sends responses.
 * Uses asyncHandler for error handling and Zod for validation.
 */

import { Request, Response } from 'express';
import { visualAnalyticsService } from '../../services/analytics/visualAnalytics.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import { ZodError } from 'zod';
import {
  facultyIdParamSchema,
  subjectIdParamSchema,
  //   semesterIdParamSchema, // If needed for future visual analytics endpoints
} from '../../utils/validators/visualAnalytics.validation';

// Define input types using z.infer directly here
// type FacultyIdParamInput = z.infer<typeof facultyIdParamSchema>;
// type SubjectIdParamInput = z.infer<typeof subjectIdParamSchema>;
// type SemesterIdParamInput = z.infer<typeof semesterIdParamSchema>;

/**
 * @description Generates data for a grouped bar chart comparing faculty vs. overall subject average.
 * @route GET /api/v1/analytics/visual/grouped-bar-chart/:facultyId
 * @param {Request} req - Express Request object (expects facultyId in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin/HOD/Faculty)
 */
export const getGroupedBarChartData = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { facultyId } = facultyIdParamSchema.parse(req.params);
      const data =
        await visualAnalyticsService.getGroupedBarChartData(facultyId);
      res.status(200).json({
        status: 'success',
        data: data,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          `Validation error: ${error.errors.map((e) => e.message).join(', ')}`,
          400
        );
      }
      throw error;
    }
  }
);

/**
 * @description Retrieves faculty performance data for a line chart, showing lecture and lab averages per semester.
 * @route GET /api/v1/analytics/visual/line-chart/:facultyId
 * @param {Request} req - Express Request object (expects facultyId in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin/HOD/Faculty)
 */
export const getFacultyPerformanceDataForLineChart = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { facultyId } = facultyIdParamSchema.parse(req.params);
      const data =
        await visualAnalyticsService.getFacultyPerformanceDataForLineChart(
          facultyId
        );
      res.status(200).json({
        status: 'success',
        data: data,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          `Validation error: ${error.errors.map((e) => e.message).join(', ')}`,
          400
        );
      }
      throw error;
    }
  }
);

/**
 * @description Retrieves a list of unique faculties that have received feedback responses.
 * @route GET /api/v1/analytics/visual/unique-faculties
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin/HOD/Faculty)
 */
export const getUniqueFacultiesWithResponses = asyncHandler(
  async (_req: Request, res: Response) => {
    const faculties =
      await visualAnalyticsService.getUniqueFacultiesWithResponses();
    res.status(200).json({
      status: 'success',
      results: faculties.length,
      data: {
        faculties: faculties,
      },
    });
  }
);

/**
 * @description Retrieves a list of unique subjects that have received feedback responses.
 * @route GET /api/v1/analytics/visual/unique-subjects
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin/HOD/Faculty)
 */
export const getUniqueSubjectsWithResponses = asyncHandler(
  async (_req: Request, res: Response) => {
    const subjects =
      await visualAnalyticsService.getUniqueSubjectsWithResponses();
    res.status(200).json({
      status: 'success',
      results: subjects.length,
      data: {
        subjects: subjects,
      },
    });
  }
);

/**
 * @description Retrieves data for a radar chart showing lecture and lab ratings per subject for a specific faculty.
 * @route GET /api/v1/analytics/visual/radar-chart/:facultyId
 * @param {Request} req - Express Request object (expects facultyId in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin/HOD/Faculty)
 */
export const getFacultyRadarData = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { facultyId } = facultyIdParamSchema.parse(req.params);
      const data = await visualAnalyticsService.getFacultyRadarData(facultyId);
      res.status(200).json({
        status: 'success',
        data: data,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          `Validation error: ${error.errors.map((e) => e.message).join(', ')}`,
          400
        );
      }
      throw error;
    }
  }
);

/**
 * @description Retrieves subject performance data, grouped by faculty, division, and batch (Lecture/Lab).
 * @route GET /api/v1/analytics/visual/subject-performance/:subjectId
 * @param {Request} req - Express Request object (expects subjectId in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin/HOD/Faculty)
 */
export const getSubjectPerformanceData = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { subjectId } = subjectIdParamSchema.parse(req.params);
      const data =
        await visualAnalyticsService.getSubjectPerformanceData(subjectId);
      res.status(200).json({
        status: 'success',
        data: data,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          `Validation error: ${error.errors.map((e) => e.message).join(', ')}`,
          400
        );
      }
      throw error;
    }
  }
);
