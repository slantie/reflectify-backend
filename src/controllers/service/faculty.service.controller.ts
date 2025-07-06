/**
 * @file src/controllers/service/faculty.service.controller.ts
 * @description Service-only controller for faculty data access (used by external services)
 */

import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import { facultyService } from '../../services/faculty/faculty.service';

/**
 * @description Get all faculty abbreviations for service-to-service communication
 * @route GET /api/v1/service/faculties/abbreviations
 * @access Service (API Key required)
 */
export const getFacultyAbbreviations = asyncHandler(
  async (_req: Request, res: Response) => {
    // Get all faculties
    const faculties = await facultyService.getAllFaculties();

    // Extract abbreviations, filter out null/empty values
    const abbreviations = faculties
      .map((faculty) => faculty.abbreviation)
      .filter((abbr) => abbr && abbr.trim().length > 0);

    // Remove duplicates
    const uniqueAbbreviations = [...new Set(abbreviations)];

    res.status(200).json({
      status: 'success',
      data: {
        abbreviations: uniqueAbbreviations,
        count: uniqueAbbreviations.length,
      },
    });
  }
);

/**
 * @description Get faculty abbreviations by department for service-to-service communication
 * @route GET /api/v1/service/faculties/abbreviations/:deptId
 * @access Service (API Key required)
 */
export const getFacultyAbbreviationsByDepartment = asyncHandler(
  async (req: Request, res: Response) => {
    const { deptId } = req.params;

    // Get all faculties for the specific department
    const faculties = await facultyService.getAllFaculties();
    const departmentFaculties = faculties.filter(
      (faculty) => faculty.departmentId === deptId
    );

    // Extract abbreviations, filter out null/empty values
    const abbreviations = departmentFaculties
      .map((faculty) => faculty.abbreviation)
      .filter((abbr) => abbr && abbr.trim().length > 0);

    // Remove duplicates
    const uniqueAbbreviations = [...new Set(abbreviations)];

    res.status(200).json({
      status: 'success',
      data: {
        abbreviations: uniqueAbbreviations,
        count: uniqueAbbreviations.length,
        departmentId: deptId,
      },
    });
  }
);
