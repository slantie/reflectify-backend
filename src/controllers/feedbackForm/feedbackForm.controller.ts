/**
 * @file src/controllers/feedbackForm/feedbackForm.controller.ts
 * @description Controller for feedback form operations.
 * Handles request parsing, delegates to FeedbackFormService, and sends responses.
 * Uses asyncHandler for error handling and Zod for validation.
 */

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

export const generateForms = asyncHandler(
  // Generates feedback forms based on department and selected semesters/divisions.
  async (req: Request, res: Response) => {
    const validatedData = generateFormsSchema.parse(req.body);

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

export const getAllForms = asyncHandler(
  // Retrieves all active feedback forms.
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

export const getFormById = asyncHandler(async (req: Request, res: Response) => {
  // Retrieves a single feedback form by ID.
  const { id } = idParamSchema.parse(req.params);

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

export const updateForm = asyncHandler(async (req: Request, res: Response) => {
  // Updates an existing feedback form.
  const { id } = idParamSchema.parse(req.params);
  const validatedData = updateFormSchema.parse(req.body);

  const updatedForm = await feedbackFormService.updateForm(id, {
    ...validatedData,
    description: validatedData.description ?? undefined,
  });

  res.status(200).json({
    status: 'success',
    message: 'Feedback form updated successfully.',
    data: {
      form: updatedForm,
    },
  });
});

export const softDeleteForm = asyncHandler(
  // Soft deletes a feedback form.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    await feedbackFormService.softDeleteForm(id);

    res.status(204).json({
      status: 'success',
      message: 'Feedback form soft-deleted successfully.',
      data: null,
    });
  }
);

export const addQuestionToForm = asyncHandler(
  // Adds a new question to an existing feedback form.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const validatedData = addQuestionToFormSchema.parse(req.body);

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

export const updateFormStatus = asyncHandler(
  // Updates the status and dates of a single feedback form.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const validatedData = updateFormStatusSchema.parse(req.body);

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

export const bulkUpdateFormStatus = asyncHandler(
  // Bulk updates the status and dates for multiple feedback forms.
  async (req: Request, res: Response) => {
    const validatedData = bulkUpdateFormStatusSchema.parse(req.body);

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

export const getFormByAccessToken = asyncHandler(
  // Retrieves a feedback form using an access token.
  async (req: Request, res: Response) => {
    const { token } = accessTokenParamSchema.parse(req.params);

    const form = await feedbackFormService.getFormByAccessToken(token);

    if (!form) {
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

export const expireOldForms = asyncHandler(
  // Expires feedback forms that are older than 7 days.
  async (_req: Request, res: Response) => {
    const count = await feedbackFormService.expireOldForms();

    res.status(200).json({
      status: 'success',
      message: `Successfully expired ${count} feedback forms.`,
      data: {
        expiredCount: count,
      },
    });
  }
);
