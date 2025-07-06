// src/controllers/subject/subject.controller.ts

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

/**
 * @description Retrieves all active subjects.
 * @route GET /api/v1/subjects
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin, Faculty, Student)
 */
export const getAllSubjects = asyncHandler(
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

/**
 * @description Retrieves a single subject by ID.
 * @route GET /api/v1/subjects/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin, Faculty, Student)
 */
export const getSubjectById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params); // Validate ID

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

/**
 * @description Creates a new subject.
 * @route POST /api/v1/subjects
 * @param {Request} req - Express Request object (expects subject data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const createSubject = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData = createSubjectSchema.parse(req.body); // Validate request body

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

/**
 * @description Updates an existing subject.
 * @route PATCH /api/v1/subjects/:id
 * @param {Request} req - Express Request object (expects id in params, partial subject data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const updateSubject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params); // Validate ID
    const validatedData = updateSubjectSchema.parse(req.body); // Validate request body

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

/**
 * @description Soft deletes a subject.
 * @route DELETE /api/v1/subjects/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const softDeleteSubject = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params); // Validate ID

    await subjectService.softDeleteSubject(id);

    res.status(204).json({
      status: 'success',
      message: 'Subject soft-deleted successfully.',
      data: null, // No content for 204
    });
  }
);

/**
 * @description Retrieves subjects by semester ID.
 * @route GET /api/v1/subjects/semester/:semesterId
 * @param {Request} req - Express Request object (expects semesterId in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin, Faculty, Student)
 */
export const getSubjectsBySemester = asyncHandler(
  async (req: Request, res: Response) => {
    const { semesterId } = semesterIdParamSchema.parse(req.params); // Validate semester ID

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

/**
 * @description Retrieves subject abbreviations, optionally filtered by department abbreviation.
 * @route GET /api/v1/subjects/abbreviations/:deptAbbr?
 * @param {Request} req - Express Request object (expects optional deptAbbr in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin, Faculty)
 */
export const getSubjectAbbreviations = asyncHandler(
  async (req: Request, res: Response) => {
    // Use safeParse to robustly handle optional parameters.
    // This will return { success: true, data: { deptAbbr: string | undefined } }
    // or { success: false, error: ZodError }
    const parsedParams = departmentAbbreviationParamSchema.safeParse(
      req.params
    );

    if (!parsedParams.success) {
      // If validation fails (e.g., if an unexpected parameter is present and doesn't match the schema,
      // or if deptAbbr is present but doesn't meet string criteria), throw an AppError.
      // This is a more robust way to handle validation errors for params.
      throw new AppError(
        `Invalid parameter: ${parsedParams.error.errors[0].message}`,
        400
      );
    }

    const { deptAbbr } = parsedParams.data; // deptAbbr will be string | undefined

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

/**
 * @description Performs a batch creation of subjects.
 * @route POST /api/v1/subjects/batch
 * @param {Request} req - Express Request object (expects { subjects: SubjectDataInput[] } in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const batchCreateSubjects = asyncHandler(
  async (req: Request, res: Response) => {
    const { subjects } = batchCreateSubjectsSchema.parse(req.body); // Validate array of subjects

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
