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

export const getStudents = asyncHandler(
  // Retrieves all active students.
  async (_req: Request, res: Response) => {
    const students = await studentService.getAllStudents();

    res.status(200).json({
      status: 'success',
      results: students.length,
      data: {
        students: students,
      },
    });
  }
);

export const createStudent = asyncHandler(
  // Creates a new student.
  async (req: Request, res: Response) => {
    const validatedData = createStudentSchema.parse(req.body);

    const student = await studentService.createStudent(validatedData);

    res.status(201).json({
      status: 'success',
      message: 'Student created successfully.',
      data: {
        student: student,
      },
    });
  }
);

export const getStudentById = asyncHandler(
  // Retrieves a single student by ID.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    const student = await studentService.getStudentById(id);

    if (!student) {
      throw new AppError('Student not found.', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        student: student,
      },
    });
  }
);

export const updateStudent = asyncHandler(
  // Updates an existing student.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const validatedData = updateStudentSchema.parse(req.body);

    const student = await studentService.updateStudent(id, validatedData);

    res.status(200).json({
      status: 'success',
      message: 'Student updated successfully.',
      data: {
        student: student,
      },
    });
  }
);

export const softDeleteStudent = asyncHandler(
  // Soft deletes a student.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    await studentService.softDeleteStudent(id);

    res.status(204).json({
      status: 'success',
      message: 'Student soft-deleted successfully.',
      data: null,
    });
  }
);

export const batchCreateStudents = asyncHandler(
  // Performs a batch creation of students.
  async (req: Request, res: Response) => {
    const { students } = batchCreateStudentsSchema.parse(req.body);

    const results = await studentService.batchCreateStudents(students);

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
