// src/controllers/common/database.controller.ts

import { Request, Response } from 'express';
import { databaseService } from '../../services/common/database.service';
import asyncHandler from '../../utils/asyncHandler';

/**
 * @description Cleans all database tables.
 * @route DELETE /api/v1/database/clean
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Super Admin only)
 */
export const cleanDatabase = asyncHandler(
  async (_req: Request, res: Response) => {
    await databaseService.cleanDatabase();

    res.status(200).json({
      status: 'success',
      message: 'Database cleaned successfully.',
    });
  }
);
