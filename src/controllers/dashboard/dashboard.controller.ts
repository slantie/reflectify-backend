/**
 * @file src/controllers/dashboard/dashboard.controller.ts
 * @description Controller layer for handling dashboard-related HTTP requests.
 */

import { Request, Response } from 'express';
import { dashboardService } from '../../services/dashboard/dashboard.service';
import asyncHandler from '../../utils/asyncHandler'; // Import asyncHandler for error wrapping

/**
 * @description Handles the request to fetch aggregated dashboard statistics.
 * This function is wrapped by asyncHandler to catch any asynchronous errors.
 * @param {Request} req - Express Request object.
 * @param {Response} res - Express Response object.
 * @access Private (Admin roles typically)
 */
export const getDashboardStats = asyncHandler(
  async (_req: Request, res: Response) => {
    // No input validation needed for this simple GET request,
    // as it doesn't take any parameters or body.

    const stats = await dashboardService.getDashboardStats();

    res.status(200).json({
      status: 'success',
      message: 'Dashboard statistics fetched successfully.',
      data: stats,
    });
  }
);
