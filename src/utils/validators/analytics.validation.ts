/**
 * @file src/utils/validators/analytics.validation.ts
 * @description Zod schemas for validating input parameters and queries for analytics endpoints.
 */

import { z } from 'zod';

// Schema for validating a UUID parameter (e.g., semesterId, subjectId)
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format. Must be a UUID.'),
});

// Schema for query parameters to filter overall semester rating
export const getOverallSemesterRatingQuerySchema = z.object({
  divisionId: z.string().uuid('Invalid division ID format.').optional(),
  batch: z.string().min(1, 'Batch cannot be empty.').optional(),
});

// Schema for query parameters to filter semester trend analysis
export const getSemesterTrendAnalysisQuerySchema = z.object({
  subjectId: z.string().uuid('Invalid subject ID format.').optional(),
});

// NEW: Schema for single faculty performance (params)
export const facultyPerformanceParamsSchema = z.object({
  academicYearId: z
    .string()
    .uuid('Invalid academicYearId format. Must be a UUID.'),
  facultyId: z.string().uuid('Invalid facultyId format. Must be a UUID.'),
});

// NEW: Schema for all faculty performance (params)
export const allFacultyPerformanceParamsSchema = z.object({
  academicYearId: z
    .string()
    .uuid('Invalid academicYearId format. Must be a UUID.'),
});
