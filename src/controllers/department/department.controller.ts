/**
 * @file src/controllers/department/department.controller.ts
 * @description Controller for Department operations.
 * Handles request parsing, delegates to DepartmentService, and sends responses.
 * Uses asyncHandler for error handling and Zod for validation.
 */

import { Request, Response } from 'express';
import { departmentService } from '../../services/department/department.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  batchCreateDepartmentsSchema,
  idParamSchema,
} from '../../utils/validators/department.validation';

export const getDepartments = asyncHandler(
  // Retrieves all active departments.
  async (_req: Request, res: Response) => {
    const departments = await departmentService.getAllDepartments();

    res.status(200).json({
      status: 'success',
      results: departments.length,
      data: {
        departments: departments,
      },
    });
  }
);

export const createDepartment = asyncHandler(
  // Creates a new department.
  async (req: Request, res: Response) => {
    const validatedData = createDepartmentSchema.parse(req.body);

    const department = await departmentService.createDepartment(validatedData);

    res.status(201).json({
      status: 'success',
      message: 'Department created successfully.',
      data: {
        department: department,
      },
    });
  }
);

export const getDepartmentById = asyncHandler(
  // Retrieves a single department by ID.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    const department = await departmentService.getDepartmentById(id);

    if (!department) {
      throw new AppError('Department not found.', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        department: department,
      },
    });
  }
);

export const updateDepartment = asyncHandler(
  // Updates an existing department.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const validatedData = updateDepartmentSchema.parse(req.body);

    const department = await departmentService.updateDepartment(
      id,
      validatedData
    );

    res.status(200).json({
      status: 'success',
      message: 'Department updated successfully.',
      data: {
        department: department,
      },
    });
  }
);

export const softDeleteDepartment = asyncHandler(
  // Soft deletes a department.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    await departmentService.softDeleteDepartment(id);

    res.status(204).json({
      status: 'success',
      message: 'Department soft-deleted successfully.',
      data: null,
    });
  }
);

export const batchCreateDepartments = asyncHandler(
  // Performs a batch creation of departments.
  async (req: Request, res: Response) => {
    const { departments } = batchCreateDepartmentsSchema.parse(req.body);

    const results = await departmentService.batchCreateDepartments(departments);

    res.status(201).json({
      status: 'success',
      message: 'Departments batch created successfully.',
      results: results.length,
      data: {
        departments: results,
      },
    });
  }
);
