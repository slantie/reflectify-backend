/**
 * @file src/controllers/studentResponse/studentResponse.controller.ts
 * @description Controller for Student Response operations.
 * Handles request parsing, delegates to StudentResponseService, and sends responses.
 * Uses asyncHandler for error handling.
 */

import { Request, Response } from 'express';
import { studentResponseService } from '../../services/studentResponse/studentResponse.service';
import asyncHandler from '../../utils/asyncHandler';
import {
  accessTokenParamSchema,
  submitResponsesBodySchema,
} from '../../utils/validators/studentResponse.validation';

export const submitResponses = asyncHandler(
  // Submits student responses for a feedback form using an access token.
  async (req: Request, res: Response) => {
    const { token } = accessTokenParamSchema.parse(req.params);
    const responses = submitResponsesBodySchema.parse(req.body);

    const createdResponses = await studentResponseService.submitResponses(
      token,
      responses
    );

    res.status(200).json({
      status: 'success',
      message: 'Feedback submitted successfully.',
      results: createdResponses.length,
      data: {
        responses: createdResponses,
      },
    });
  }
);

export const checkSubmission = asyncHandler(
  // Checks the submission status of a feedback form using an access token.
  async (req: Request, res: Response) => {
    const { token } = accessTokenParamSchema.parse(req.params);

    const submissionStatus =
      await studentResponseService.checkSubmission(token);

    res.status(200).json({
      status: 'success',
      data: submissionStatus,
    });
  }
);
