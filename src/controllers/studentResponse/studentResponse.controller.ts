// src/controllers/studentResponse/studentResponse.controller.ts

import { Request, Response } from 'express';
import { studentResponseService } from '../../services/studentResponse/studentResponse.service';
import asyncHandler from '../../utils/asyncHandler';
// import AppError from '../../utils/appError';
import {
  accessTokenParamSchema,
  submitResponsesBodySchema,
} from '../../utils/validators/studentResponse.validation';

/**
 * @description Submits student responses for a feedback form using an access token.
 * @route POST /api/v1/student-responses/submit/:token
 * @param {Request} req - Express Request object (expects token in params, responses in body)
 * @param {Response} res - Express Response object
 * @access Public (Student via token)
 */
export const submitResponses = asyncHandler(
  async (req: Request, res: Response) => {
    // Validate token from params
    const { token } = accessTokenParamSchema.parse(req.params);
    // Validate responses from body
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

/**
 * @description Checks the submission status of a feedback form using an access token.
 * @route GET /api/v1/student-responses/check-submission/:token
 * @param {Request} req - Express Request object (expects token in params)
 * @param {Response} res - Express Response object
 * @access Public (Student via token)
 */
export const checkSubmission = asyncHandler(
  async (req: Request, res: Response) => {
    // Validate token from params
    const { token } = accessTokenParamSchema.parse(req.params);

    const submissionStatus =
      await studentResponseService.checkSubmission(token);

    res.status(200).json({
      status: 'success',
      data: submissionStatus, // { isSubmitted: boolean }
    });
  }
);
