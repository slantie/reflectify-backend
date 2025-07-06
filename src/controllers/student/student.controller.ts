/**
 * @file src/controllers/student/student.controller.ts
 * @description Controller for Student operations.
 * Handles request parsing, delegates to StudentService, and sends responses.
 * Uses asyncHandler for error handling and Zod for validation.
 */

import { Request, Response } from 'express';
import { studentService } from '../../services/student/student.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import {
  createStudentSchema,
  updateStudentSchema,
  batchCreateStudentsSchema,
  idParamSchema,
} from '../../utils/validators/student.validation';

/**
 * @description Retrieves all active students.
 * @route GET /api/v1/students
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const getStudents = asyncHandler(async (_req: Request, res: Response) => {
  // Delegate to service layer
  const students = await studentService.getAllStudents();

  // Send success response
  res.status(200).json({
    status: 'success',
    results: students.length,
    data: {
      students: students,
    },
  });
});

/**
 * @description Creates a new student.
 * @route POST /api/v1/students
 * @param {Request} req - Express Request object (expects student data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const createStudent = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request body using Zod
    const validatedData = createStudentSchema.parse(req.body);

    // 2. Delegate to service layer
    const student = await studentService.createStudent(validatedData);

    // 3. Send success response
    res.status(201).json({
      status: 'success',
      message: 'Student created successfully.',
      data: {
        student: student,
      },
    });
  }
);

/**
 * @description Retrieves a single student by ID.
 * @route GET /api/v1/students/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const getStudentById = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters using Zod
    const { id } = idParamSchema.parse(req.params);

    // 2. Delegate to service layer
    const student = await studentService.getStudentById(id);

    // 3. Handle not found scenario
    if (!student) {
      throw new AppError('Student not found.', 404);
    }

    // 4. Send success response
    res.status(200).json({
      status: 'success',
      data: {
        student: student,
      },
    });
  }
);

/**
 * @description Updates an existing student.
 * @route PATCH /api/v1/students/:id
 * @param {Request} req - Express Request object (expects id in params, partial student data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const updateStudent = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters and body using Zod
    const { id } = idParamSchema.parse(req.params);
    const validatedData = updateStudentSchema.parse(req.body);

    // 2. Delegate to service layer
    const student = await studentService.updateStudent(id, validatedData);

    // 3. Send success response
    res.status(200).json({
      status: 'success',
      message: 'Student updated successfully.',
      data: {
        student: student,
      },
    });
  }
);

/**
 * @description Soft deletes a student.
 * @route DELETE /api/v1/students/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const softDeleteStudent = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters using Zod
    const { id } = idParamSchema.parse(req.params);

    // 2. Delegate to service layer (soft delete)
    await studentService.softDeleteStudent(id);

    // 3. Send success response (204 No Content for successful deletion)
    res.status(204).json({
      status: 'success',
      message: 'Student soft-deleted successfully.',
      data: null, // No content for 204
    });
  }
);

/**
 * @description Performs a batch creation of students.
 * @route POST /api/v1/students/batch
 * @param {Request} req - Express Request object (expects { students: StudentDataInput[] } in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const batchCreateStudents = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request body using Zod
    const { students } = batchCreateStudentsSchema.parse(req.body);

    // 2. Delegate to service layer
    const results = await studentService.batchCreateStudents(students);

    // 3. Send success response
    res.status(201).json({
      status: 'success',
      message: 'Students batch created successfully.',
      results: results.length,
      data: {
        students: results,
      },
    });
  }
);
