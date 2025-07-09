/**
 * @file src/controllers/subject/subject.controller.ts
 * @description Controller for Subject operations.
 * Handles request parsing, delegates to SubjectService, and sends responses.
 * Uses asyncHandler for error handling and Zod for validation.
 */

import { Request, Response } from 'express';
import { subjectService } from '../../services/subject/subject.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import {
  createSubjectSchema,
  updateSubjectSchema,
  idParamSchema,
  semesterIdParamSchema,
  departmentAbbreviationParamSchema,
  batchCreateSubjectsSchema,
} from '../../utils/validators/subject.validation';

export const getAllSubjects = asyncHandler(
  // Retrieves all active subjects.
  async (_req: Request, res: Response) => {
    const subjects = await subjectService.getAllSubjects();

    res.status(200).json({
      status: 'success',
      results: subjects.length,
      data: {
        subjects: subjects,
      },
    });
  }
);

export const getSubjectById = asyncHandler(
  // Retrieves a single subject by ID.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    const subject = await subjectService.getSubjectById(id);

    if (!subject) {
      throw new AppError('Subject not found.', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        subject: subject,
      },
    });
  }
);

export const createSubject = asyncHandler(
  // Creates a new subject.
  async (req: Request, res: Response) => {
    const validatedData = createSubjectSchema.parse(req.body);

    const subject = await subjectService.createSubject(validatedData);

    res.status(201).json({
      status: 'success',
      message: 'Subject created successfully.',
      data: {
        subject: subject,
      },
    });
  }
);

export const updateSubject = asyncHandler(
  // Updates an existing subject.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const validatedData = updateSubjectSchema.parse(req.body);

    const updatedSubject = await subjectService.updateSubject(
      id,
      validatedData
    );

    res.status(200).json({
      status: 'success',
      message: 'Subject updated successfully.',
      data: {
        subject: updatedSubject,
      },
    });
  }
);

export const softDeleteSubject = asyncHandler(
  // Soft deletes a subject.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    await subjectService.softDeleteSubject(id);

    res.status(204).json({
      status: 'success',
      message: 'Subject soft-deleted successfully.',
      data: null,
    });
  }
);

export const getSubjectsBySemester = asyncHandler(
  // Retrieves subjects by semester ID.
  async (req: Request, res: Response) => {
    const { semesterId } = semesterIdParamSchema.parse(req.params);

    const subjects = await subjectService.getSubjectsBySemester(semesterId);

    res.status(200).json({
      status: 'success',
      results: subjects.length,
      message: 'Subjects fetched by semester successfully.',
      data: {
        subjects: subjects,
      },
    });
  }
);

export const getSubjectAbbreviations = asyncHandler(
  // Retrieves subject abbreviations, optionally filtered by department abbreviation.
  async (req: Request, res: Response) => {
    const parsedParams = departmentAbbreviationParamSchema.safeParse(
      req.params
    );

    if (!parsedParams.success) {
      throw new AppError(
        `Invalid parameter: ${parsedParams.error.errors[0].message}`,
        400
      );
    }

    const { deptAbbr } = parsedParams.data;

    const abbreviations =
      await subjectService.getSubjectAbbreviations(deptAbbr);

    res.status(200).json({
      status: 'success',
      results: abbreviations.length,
      message: 'Subject abbreviations fetched successfully.',
      data: {
        abbreviations: abbreviations,
      },
    });
  }
);

export const batchCreateSubjects = asyncHandler(
  // Performs a batch creation of subjects.
  async (req: Request, res: Response) => {
    const { subjects } = batchCreateSubjectsSchema.parse(req.body);

    const results = await subjectService.batchCreateSubjects(subjects);

    res.status(201).json({
      status: 'success',
      message: 'Subjects batch created successfully.',
      results: results.length,
      data: {
        subjects: results,
      },
    });
  }
);
