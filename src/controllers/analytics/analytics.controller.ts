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

export const getOverallSemesterRating = asyncHandler(
  // Retrieves the overall average rating for a specific semester, with optional filters.
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
      throw error;
    }
  }
);

export const getSemestersWithResponses = asyncHandler(
  // Retrieves a list of semesters that have associated feedback responses, with optional filtering.
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

export const getSubjectWiseLectureLabRating = asyncHandler(
  // Gets subject-wise ratings split by lecture and lab types for a specific semester.
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

export const getHighImpactFeedbackAreas = asyncHandler(
  // Identifies high-impact feedback areas (questions with significant low ratings) for a given semester.
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

export const getSemesterTrendAnalysis = asyncHandler(
  // Analyzes performance trends across semesters for subjects.
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

export const getAnnualPerformanceTrend = asyncHandler(
  // Retrieves annual performance trends based on aggregated feedback analytics.
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

export const getDivisionBatchComparisons = asyncHandler(
  // Compares average ratings across different divisions and batches for a given semester.
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

export const getLabLectureComparison = asyncHandler(
  // Compares average ratings between different lecture types (e.g., LECTURE, LAB) for a given semester.
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

export const getFacultyPerformanceYearData = asyncHandler(
  // Retrieves performance data for a single faculty member across semesters for a given academic year.
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

export const getAllFacultyPerformanceData = asyncHandler(
  // Retrieves performance data for all faculty members for a given academic year.
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

export const getTotalResponses = asyncHandler(
  // Retrieves the total number of student responses.
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

export const getSemesterDivisions = asyncHandler(
  // Retrieves semesters and their divisions, including response counts for each division.
  async (_req: Request, res: Response) => {
    const data =
      await analyticsService.getSemesterDivisionsWithResponseCounts();
    res.status(200).json({
      success: true,
      data: data,
    });
  }
);

export const getFilterDictionary = asyncHandler(
  // Retrieves hierarchical filter dictionary for analytics (Academic Years → Departments → Subjects).
  async (_req: Request, res: Response) => {
    const filterData = await analyticsService.getFilterDictionary();
    res.status(200).json({
      status: 'success',
      data: filterData,
    });
  }
);

export const getCompleteAnalyticsData = asyncHandler(
  // Retrieves complete analytics data with filters for client-side processing.
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
