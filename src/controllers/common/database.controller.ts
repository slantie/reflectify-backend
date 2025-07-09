/**
 * @file src/controllers/common/database.controller.ts
 * @description Controller for database operations.
 * Handles request parsing, delegates to DatabaseService, and sends responses.
 * Uses asyncHandler for error handling.
 */

import { Request, Response } from 'express';
import { databaseService } from '../../services/common/database.service';
import asyncHandler from '../../utils/asyncHandler';

export const cleanDatabase = asyncHandler(
  // Cleans all database tables.
  async (_req: Request, res: Response) => {
    await databaseService.cleanDatabase();

    res.status(200).json({
      status: 'success',
      message: 'Database cleaned successfully.',
    });
  }
);
