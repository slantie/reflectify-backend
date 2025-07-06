// src/controllers/feedbackForm/feedbackForm.controller.ts

import { Request, Response } from 'express';
import { feedbackFormService } from '../../services/feedbackForm/feedbackForm.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import {
  generateFormsSchema,
  addQuestionToFormSchema,
  updateFormSchema,
  updateFormStatusSchema,
  bulkUpdateFormStatusSchema,
  idParamSchema,
  accessTokenParamSchema,
} from '../../utils/validators/feedbackForm.validation';

/**
 * @description Generates feedback forms based on department and selected semesters/divisions.
 * @route POST /api/v1/feedback-forms/generate
 * @param {Request} req - Express Request object (expects generation request data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const generateForms = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData = generateFormsSchema.parse(req.body); // Validate request body

    const generatedForms =
      await feedbackFormService.generateForms(validatedData);

    res.status(201).json({
      status: 'success',
      message: `Successfully generated ${generatedForms.length} feedback forms.`,
      results: generatedForms.length,
      data: {
        forms: generatedForms,
      },
    });
  }
);

/**
 * @description Retrieves all active feedback forms.
 * @route GET /api/v1/feedback-forms
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD, AsstProf, Student)
 */
export const getAllForms = asyncHandler(
  async (_req: Request, res: Response) => {
    const forms = await feedbackFormService.getAllForms();

    res.status(200).json({
      status: 'success',
      results: forms.length,
      data: {
        forms: forms,
      },
    });
  }
);

/**
 * @description Retrieves a single feedback form by ID.
 * @route GET /api/v1/feedback-forms/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD, AsstProf, Student)
 */
export const getFormById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params); // Validate ID

  const form = await feedbackFormService.getFormById(id);

  if (!form) {
    throw new AppError('Feedback form not found.', 404);
  }

  res.status(200).json({
    status: 'success',
    data: {
      form: form,
    },
  });
});

/**
 * @description Updates an existing feedback form.
 * @route PATCH /api/v1/feedback-forms/:id
 * @param {Request} req - Express Request object (expects id in params, partial form data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const updateForm = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params); // Validate ID
  const validatedData = updateFormSchema.parse(req.body); // Validate request body

  const updatedForm = await feedbackFormService.updateForm(id, validatedData);

  res.status(200).json({
    status: 'success',
    message: 'Feedback form updated successfully.',
    data: {
      form: updatedForm,
    },
  });
});

/**
 * @description Soft deletes a feedback form.
 * @route DELETE /api/v1/feedback-forms/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const softDeleteForm = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params); // Validate ID

    await feedbackFormService.softDeleteForm(id);

    res.status(204).json({
      status: 'success',
      message: 'Feedback form soft-deleted successfully.',
      data: null, // No content for 204
    });
  }
);

/**
 * @description Adds a new question to an existing feedback form.
 * @route POST /api/v1/feedback-forms/:id/questions
 * @param {Request} req - Express Request object (expects form ID in params, question data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const addQuestionToForm = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params); // Validate form ID
    const validatedData = addQuestionToFormSchema.parse(req.body); // Validate question data

    const updatedForm = await feedbackFormService.addQuestionToForm(
      id,
      validatedData
    );

    res.status(200).json({
      status: 'success',
      message: 'Question added to form successfully.',
      data: {
        form: updatedForm,
      },
    });
  }
);

/**
 * @description Updates the status and dates of a single feedback form.
 * @route PATCH /api/v1/feedback-forms/:id/status
 * @param {Request} req - Express Request object (expects form ID in params, status/date data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const updateFormStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params); // Validate form ID
    const validatedData = updateFormStatusSchema.parse(req.body); // Validate status/date data

    const updatedForm = await feedbackFormService.updateFormStatus(
      id,
      validatedData
    );

    res.status(200).json({
      status: 'success',
      message: `Form status updated to ${updatedForm.status}.`,
      data: {
        form: updatedForm,
      },
    });
  }
);

/**
 * @description Bulk updates the status and dates for multiple feedback forms.
 * @route PATCH /api/v1/feedback-forms/bulk-status
 * @param {Request} req - Express Request object (expects array of form IDs, status, and dates in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const bulkUpdateFormStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData = bulkUpdateFormStatusSchema.parse(req.body); // Validate bulk update data

    const updatedForms =
      await feedbackFormService.bulkUpdateFormStatus(validatedData);

    res.status(200).json({
      status: 'success',
      message: `Successfully updated ${updatedForms.length} forms to ${validatedData.status}.`,
      results: updatedForms.length,
      data: {
        forms: updatedForms,
      },
    });
  }
);

/**
 * @description Retrieves a feedback form using an access token.
 * @route GET /api/v1/feedback-forms/access/:token
 * @param {Request} req - Express Request object (expects access token in params)
 * @param {Response} res - Express Response object
 * @access Public (Student via token)
 */
export const getFormByAccessToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = accessTokenParamSchema.parse(req.params); // Validate access token

    const form = await feedbackFormService.getFormByAccessToken(token);

    if (!form) {
      // Service throws AppError for specific not found/forbidden cases,
      // so this 'if' might only catch null from service if it doesn't throw.
      // However, the service is designed to throw AppError, so this branch might not be hit.
      throw new AppError('Form not found or inaccessible.', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        form: form,
      },
    });
  }
);
