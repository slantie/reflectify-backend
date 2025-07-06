/**
 * @file src/controllers/service/subject.service.controller.ts
 * @description Service-only controller for subject data access (used by external services)
 */

import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import { subjectService } from '../../services/subject/subject.service';

/**
 * @description Get all subject abbreviations for service-to-service communication
 * @route GET /api/v1/service/subjects/abbreviations
 * @access Service (API Key required)
 */
export const getSubjectAbbreviations = asyncHandler(
  async (_req: Request, res: Response) => {
    // Get all subjects
    const subjects = await subjectService.getAllSubjects();

    // Extract abbreviations, filter out null/empty values
    const abbreviations = subjects
      .map((subject) => subject.abbreviation)
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
 * @description Get subject abbreviations by department for service-to-service communication
 * @route GET /api/v1/service/subjects/abbreviations/:deptId
 * @access Service (API Key required)
 */
export const getSubjectAbbreviationsByDepartment = asyncHandler(
  async (req: Request, res: Response) => {
    const { deptId } = req.params;

    // Get all subjects for the specific department
    const subjects = await subjectService.getAllSubjects();
    const departmentSubjects = subjects.filter(
      (subject) => subject.departmentId === deptId
    );

    // Extract abbreviations, filter out null/empty values
    const abbreviations = departmentSubjects
      .map((subject) => subject.abbreviation)
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
