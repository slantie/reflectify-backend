/**
 * @file src/controllers/dashboard/dashboard.controller.ts
 * @description Controller layer for handling dashboard-related HTTP requests.
 */

import { Request, Response } from 'express';
import { dashboardService } from '../../services/dashboard/dashboard.service';
import asyncHandler from '../../utils/asyncHandler';

export const getDashboardStats = asyncHandler(
  // Handles the request to fetch aggregated dashboard statistics.
  async (_req: Request, res: Response) => {
    const stats = await dashboardService.getDashboardStats();

    res.status(200).json({
      status: 'success',
      message: 'Dashboard statistics fetched successfully.',
      data: stats,
    });
  }
);

export const deleteAllData = asyncHandler(
  // Handles the request to delete all database data (development only).
  async (_req: Request, res: Response) => {
    await dashboardService.deleteAllData();

    res.status(200).json({
      status: 'success',
      message: 'All database data deleted successfully.',
      data: null,
    });
  }
);
