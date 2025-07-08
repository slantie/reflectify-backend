/**
 * @file src/controllers/analytics/analytics.controller.ts
 * @description Controller for feedback analytics operations.
 * Handles request parsing, delegates to AnalyticsService, and sends responses.
 * Uses asyncHandler for error handling and Zod for validation.
 */

import { Request, Response } from 'express';
import { analyticsService } from '../../services/analytics/analytics.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import { ZodError } from 'zod';
import {
  idParamSchema,
  getOverallSemesterRatingQuerySchema,
  getSemestersWithResponsesQuerySchema,
  getSubjectWiseLectureLabRatingQuerySchema,
  getSemesterTrendAnalysisQuerySchema,
  facultyPerformanceParamsSchema,
  allFacultyPerformanceParamsSchema,
} from '../../utils/validators/analytics.validation';

/**
 * @description Retrieves the overall average rating for a specific semester, with optional filters.
 * @route GET /api/v1/analytics/semesters/:id/overall-rating
 * @param {Request} req - Express Request object (expects semesterId in params, divisionId/batch in query)
 * @param {Response} res - Express Response object
 * @access Private (Admin/Faculty)
 */
export const getOverallSemesterRating = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { id: semesterId } = idParamSchema.parse(req.params);
      const { divisionId, batch } = getOverallSemesterRatingQuerySchema.parse(
        req.query
      );

      const result = await analyticsService.getOverallSemesterRating(
        semesterId,
        divisionId,
        batch
      );

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          `Invalid input parameters: ${error.errors.map((e) => e.message).join(', ')}`,
          400
        );
      }
      throw error; // Re-throw AppError from service
    }
  }
);

/**
 * @description Retrieves a list of semesters that have associated feedback responses, with optional filtering.
 * @route GET /api/v1/analytics/semesters-with-responses
 * @param {Request} req - Express Request object (expects optional academicYearId, departmentId in query)
 * @param {Response} res - Express Response object
 * @access Private (Admin/Faculty)
 */
export const getSemestersWithResponses = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { academicYearId, departmentId } =
        getSemestersWithResponsesQuerySchema.parse(req.query);

      const semesters = await analyticsService.getSemestersWithResponses(
        academicYearId,
        departmentId
      );

      res.status(200).json({
        status: 'success',
        results: semesters.length,
        data: {
          semesters: semesters,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          `Invalid query parameters: ${error.errors.map((e) => e.message).join(', ')}`,
          400
        );
      }
      throw error;
    }
  }
);

/**
 * @description Gets subject-wise ratings split by lecture and lab types for a specific semester.
 * @route GET /api/v1/analytics/semesters/:id/subject-wise-rating
 * @param {Request} req - Express Request object (expects semesterId in params, optional academicYearId in query)
 * @param {Response} res - Express Response object
 * @access Private (Admin/Faculty)
 */
export const getSubjectWiseLectureLabRating = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { id: semesterId } = idParamSchema.parse(req.params);
      const { academicYearId } =
        getSubjectWiseLectureLabRatingQuerySchema.parse(req.query);
      const ratings = await analyticsService.getSubjectWiseLectureLabRating(
        semesterId,
        academicYearId
      );
      res.status(200).json({
        status: 'success',
        results: ratings.length,
        data: {
          ratings: ratings,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          `Invalid parameters: ${error.errors.map((e) => e.message).join(', ')}`,
          400
        );
      }
      throw error;
    }
  }
);

/**
 * @description Identifies high-impact feedback areas (questions with significant low ratings) for a given semester.
 * @route GET /api/v1/analytics/semesters/:id/high-impact-areas
 * @param {Request} req - Express Request object (expects semesterId in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin/Faculty)
 */
export const getHighImpactFeedbackAreas = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { id: semesterId } = idParamSchema.parse(req.params);
      const impactAreas =
        await analyticsService.getHighImpactFeedbackAreas(semesterId);
      res.status(200).json({
        status: 'success',
        results: impactAreas.length,
        data: {
          impactAreas: impactAreas,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          `Invalid semester ID: ${error.errors.map((e) => e.message).join(', ')}`,
          400
        );
      }
      throw error;
    }
  }
);

/**
 * @description Analyzes performance trends across semesters for subjects.
 * @route GET /api/v1/analytics/semester-trend-analysis
 * @param {Request} req - Express Request object (expects optional subjectId and academicYearId in query)
 * @param {Response} res - Express Response object
 * @access Private (Admin/Faculty)
 */
export const getSemesterTrendAnalysis = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { subjectId, academicYearId } =
        getSemesterTrendAnalysisQuerySchema.parse(req.query);
      const trends = await analyticsService.getSemesterTrendAnalysis(
        subjectId,
        academicYearId
      );
      res.status(200).json({
        status: 'success',
        results: trends.length,
        data: {
          trends: trends,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          `Invalid query parameters: ${error.errors.map((e) => e.message).join(', ')}`,
          400
        );
      }
      throw error;
    }
  }
);

/**
 * @description Retrieves annual performance trends based on aggregated feedback analytics.
 * @route GET /api/v1/analytics/annual-performance-trend
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin/Faculty)
 */
export const getAnnualPerformanceTrend = asyncHandler(
  async (_req: Request, res: Response) => {
    const trends = await analyticsService.getAnnualPerformanceTrend();
    res.status(200).json({
      status: 'success',
      results: trends.length,
      data: {
        trends: trends,
      },
    });
  }
);

/**
 * @description Compares average ratings across different divisions and batches for a given semester.
 * @route GET /api/v1/analytics/semesters/:id/division-batch-comparisons
 * @param {Request} req - Express Request object (expects semesterId in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin/Faculty)
 */
export const getDivisionBatchComparisons = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { id: semesterId } = idParamSchema.parse(req.params);
      const comparisons =
        await analyticsService.getDivisionBatchComparisons(semesterId);
      res.status(200).json({
        status: 'success',
        results: comparisons.length,
        data: {
          comparisons: comparisons,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          `Invalid semester ID: ${error.errors.map((e) => e.message).join(', ')}`,
          400
        );
      }
      throw error;
    }
  }
);

/**
 * @description Compares average ratings between different lecture types (e.g., LECTURE, LAB) for a given semester.
 * @route GET /api/v1/analytics/semesters/:id/lab-lecture-comparison
 * @param {Request} req - Express Request object (expects semesterId in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin/Faculty)
 */
export const getLabLectureComparison = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { id: semesterId } = idParamSchema.parse(req.params);
      const comparisons =
        await analyticsService.getLabLectureComparison(semesterId);
      res.status(200).json({
        status: 'success',
        results: comparisons.length,
        data: {
          comparisons: comparisons,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          `Invalid semester ID: ${error.errors.map((e) => e.message).join(', ')}`,
          400
        );
      }
      throw error;
    }
  }
);

// Controller for single faculty performance year data
/**
 * @description Retrieves performance data for a single faculty member across semesters for a given academic year.
 * @route GET /api/v1/analytics/faculty/:facultyId/performance/:academicYearId
 * @param {Request} req - Express Request object (expects academicYearId and facultyId in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin/HOD/Faculty for their own data)
 */
export const getFacultyPerformanceYearData = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { academicYearId, facultyId } =
        facultyPerformanceParamsSchema.parse(req.params);
      const result = await analyticsService.getFacultyPerformanceYearData(
        academicYearId,
        facultyId
      );
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          `Invalid parameters: ${error.errors.map((e) => e.message).join(', ')}`,
          400
        );
      }
      throw error;
    }
  }
);

// Controller for all faculty performance data for an academic year
/**
 * @description Retrieves performance data for all faculty members for a given academic year.
 * @route GET /api/v1/analytics/faculty/performance/:academicYearId
 * @param {Request} req - Express Request object (expects academicYearId in params)
 * @param {Response} res - Express Response object
 * @access Private (SUPER_ADMIN, HOD)
 */
export const getAllFacultyPerformanceData = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { academicYearId } = allFacultyPerformanceParamsSchema.parse(
        req.params
      );
      const result =
        await analyticsService.getAllFacultyPerformanceData(academicYearId);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          `Invalid academic year ID: ${error.errors.map((e) => e.message).join(', ')}`,
          400
        );
      }
      throw error;
    }
  }
);

// Controller for total responses count
/**
 * @description Retrieves the total number of student responses.
 * @route GET /api/v1/analytics/total-responses
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin/Faculty)
 */
export const getTotalResponses = asyncHandler(
  async (_req: Request, res: Response) => {
    const totalCount = await analyticsService.getTotalResponses();
    res.status(200).json({
      status: 'success',
      data: {
        totalResponses: totalCount,
      },
    });
  }
);

// NEW: Controller for semester divisions with response counts
/**
 * @description Retrieves semesters and their divisions, including response counts for each division.
 * @route GET /api/v1/analytics/semester-divisions-with-responses
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin/HOD/AsstProf)
 */
export const getSemesterDivisions = asyncHandler(
  async (_req: Request, res: Response) => {
    const data =
      await analyticsService.getSemesterDivisionsWithResponseCounts();
    res.status(200).json({
      success: true, // Keeping original success: true for this endpoint
      data: data,
    });
  }
);

/**
 * @description Retrieves hierarchical filter dictionary for analytics (Academic Years → Departments → Subjects)
 * @route GET /api/v1/analytics/filter-dictionary
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin/Faculty)
 */
export const getFilterDictionary = asyncHandler(
  async (_req: Request, res: Response) => {
    const filterData = await analyticsService.getFilterDictionary();
    res.status(200).json({
      status: 'success',
      data: filterData,
    });
  }
);

/**
 * @description Retrieves complete analytics data with filters for client-side processing
 * @route GET /api/v1/analytics/complete-data
 * @param {Request} req - Express Request object (expects academicYearId, departmentId, subjectId, semesterId, divisionId, lectureType, includeDeleted in query)
 * @param {Response} res - Express Response object
 * @access Private (Admin/Faculty)
 */
export const getCompleteAnalyticsData = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      academicYearId,
      departmentId,
      subjectId,
      semesterId,
      divisionId,
      lectureType,
      includeDeleted,
    } = req.query;

    const result = await analyticsService.getCompleteAnalyticsData(
      academicYearId as string | undefined,
      departmentId as string | undefined,
      subjectId as string | undefined,
      semesterId as string | undefined,
      divisionId as string | undefined,
      lectureType as 'LECTURE' | 'LAB' | undefined,
      includeDeleted === 'true'
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }
);
