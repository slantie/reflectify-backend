/**
 * @file src/utils/validators/analytics.validation.ts
 * @description Zod schemas for validating input parameters and queries for analytics endpoints.
 */

import { z } from 'zod';

// Schema for validating a UUID parameter.
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format. Must be a UUID.'),
});

// Schema for query parameters to filter overall semester rating.
export const getOverallSemesterRatingQuerySchema = z.object({
  divisionId: z.string().uuid('Invalid division ID format.').optional(),
  batch: z.string().min(1, 'Batch cannot be empty.').optional(),
});

// Schema for query parameters to filter semesters with responses.
export const getSemestersWithResponsesQuerySchema = z.object({
  academicYearId: z
    .string()
    .uuid('Invalid academic year ID format.')
    .optional(),
  departmentId: z.string().uuid('Invalid department ID format.').optional(),
});

// Schema for query parameters to filter subject-wise lecture lab rating.
export const getSubjectWiseLectureLabRatingQuerySchema = z.object({
  academicYearId: z
    .string()
    .uuid('Invalid academic year ID format.')
    .optional(),
});

// Schema for query parameters to filter semester trend analysis.
export const getSemesterTrendAnalysisQuerySchema = z.object({
  subjectId: z.string().uuid('Invalid subject ID format.').optional(),
  academicYearId: z
    .string()
    .uuid('Invalid academic year ID format.')
    .optional(),
});

// Schema for single faculty performance parameters.
export const facultyPerformanceParamsSchema = z.object({
  academicYearId: z
    .string()
    .uuid('Invalid academicYearId format. Must be a UUID.'),
  facultyId: z.string().uuid('Invalid facultyId format. Must be a UUID.'),
});

// Schema for all faculty performance parameters.
export const allFacultyPerformanceParamsSchema = z.object({
  academicYearId: z.string(),
  // .uuid('Invalid academicYearId format. Must be a UUID.'),
});
