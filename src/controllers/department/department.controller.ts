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

/**
 * @description Retrieves all active departments.
 * @route GET /api/v1/departments
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const getDepartments = asyncHandler(
  async (_req: Request, res: Response) => {
    // Delegate to service layer
    const departments = await departmentService.getAllDepartments();

    // Send success response
    res.status(200).json({
      status: 'success',
      results: departments.length,
      data: {
        departments: departments,
      },
    });
  }
);

/**
 * @description Creates a new department.
 * @route POST /api/v1/departments
 * @param {Request} req - Express Request object (expects department data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const createDepartment = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request body using Zod
    const validatedData = createDepartmentSchema.parse(req.body);

    // 2. Delegate to service layer
    const department = await departmentService.createDepartment(validatedData);

    // 3. Send success response
    res.status(201).json({
      status: 'success',
      message: 'Department created successfully.',
      data: {
        department: department,
      },
    });
  }
);

/**
 * @description Retrieves a single department by ID.
 * @route GET /api/v1/departments/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const getDepartmentById = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters using Zod
    const { id } = idParamSchema.parse(req.params);

    // 2. Delegate to service layer
    const department = await departmentService.getDepartmentById(id);

    // 3. Handle not found scenario
    if (!department) {
      throw new AppError('Department not found.', 404);
    }

    // 4. Send success response
    res.status(200).json({
      status: 'success',
      data: {
        department: department,
      },
    });
  }
);

/**
 * @description Updates an existing department.
 * @route PATCH /api/v1/departments/:id
 * @param {Request} req - Express Request object (expects id in params, partial department data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const updateDepartment = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters and body using Zod
    const { id } = idParamSchema.parse(req.params);
    const validatedData = updateDepartmentSchema.parse(req.body);

    // 2. Delegate to service layer
    const department = await departmentService.updateDepartment(
      id,
      validatedData
    );

    // 3. Send success response
    res.status(200).json({
      status: 'success',
      message: 'Department updated successfully.',
      data: {
        department: department,
      },
    });
  }
);

/**
 * @description Soft deletes a department.
 * @route DELETE /api/v1/departments/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const softDeleteDepartment = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request parameters using Zod
    const { id } = idParamSchema.parse(req.params);

    // 2. Delegate to service layer (soft delete)
    await departmentService.softDeleteDepartment(id);

    // 3. Send success response (204 No Content for successful deletion)
    res.status(204).json({
      status: 'success',
      message: 'Department soft-deleted successfully.',
      data: null, // No content for 204
    });
  }
);

/**
 * @description Performs a batch creation of departments.
 * @route POST /api/v1/departments/batch
 * @param {Request} req - Express Request object (expects { departments: DepartmentDataInput[] } in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin)
 */
export const batchCreateDepartments = asyncHandler(
  async (req: Request, res: Response) => {
    // 1. Validate request body using Zod
    const { departments } = batchCreateDepartmentsSchema.parse(req.body);

    // 2. Delegate to service layer
    const results = await departmentService.batchCreateDepartments(departments);

    // 3. Send success response
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
