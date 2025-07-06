/**
 * @file src/utils/validators/visualAnalytics.validation.ts
 * @description Zod schemas for validating input parameters and queries for visual analytics endpoints.
 */

import { z } from 'zod';

// Schema for validating a facultyId parameter (for grouped bar chart, line chart, radar chart)
export const facultyIdParamSchema = z.object({
  facultyId: z.string().uuid('Invalid faculty ID format. Must be a UUID.'),
});

// Schema for validating a subjectId parameter (for subject-wise performance)
export const subjectIdParamSchema = z.object({
  subjectId: z.string().uuid('Invalid subject ID format. Must be a UUID.'),
});

// Schema for validating a semesterId parameter (if needed for visual analytics, e.g., line chart)
export const semesterIdParamSchema = z.object({
  semesterId: z.string().uuid('Invalid semester ID format. Must be a UUID.'),
});

// For getGroupedBarChartData, facultyId is expected in body, not params, so no specific schema here for params.
// If it changes to params, this can be used.
