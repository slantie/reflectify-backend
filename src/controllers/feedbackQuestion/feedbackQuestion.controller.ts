/**
 * @file src/controllers/feedbackQuestion/feedbackQuestion.controller.ts
 * @description Controller for Feedback Question operations.
 * Handles request parsing, delegates to FeedbackQuestionService, and sends responses.
 * Uses asyncHandler for error handling and Zod for validation.
 */

import { Request, Response } from 'express';
import { feedbackQuestionService } from '../../services/feedbackQuestion/feedbackQuestion.service';
import asyncHandler from '../../utils/asyncHandler';
import AppError from '../../utils/appError';
import {
  createQuestionCategorySchema,
  updateQuestionCategorySchema,
  createFeedbackQuestionSchema,
  updateFeedbackQuestionSchema,
  batchUpdateFeedbackQuestionsSchema,
  idParamSchema,
  formIdParamSchema,
} from '../../utils/validators/feedbackQuestion.validation';

export const getAllQuestionCategories = asyncHandler(
  // Retrieves all active question categories.
  async (_req: Request, res: Response) => {
    const categories = await feedbackQuestionService.getAllQuestionCategories();

    res.status(200).json({
      status: 'success',
      results: categories.length,
      data: {
        categories: categories,
      },
    });
  }
);

export const getQuestionCategoryById = asyncHandler(
  // Retrieves a single question category by ID.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse({ id: req.params.id });

    const category = await feedbackQuestionService.getQuestionCategoryById(id);

    if (!category) {
      throw new AppError('Question category not found.', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        category: category,
      },
    });
  }
);

export const createQuestionCategory = asyncHandler(
  // Creates a new question category.
  async (req: Request, res: Response) => {
    const validatedData = createQuestionCategorySchema.parse(req.body);

    const newCategory =
      await feedbackQuestionService.createQuestionCategory(validatedData);

    res.status(201).json({
      status: 'success',
      message: 'Question category created successfully.',
      data: {
        category: newCategory,
      },
    });
  }
);

export const updateQuestionCategory = asyncHandler(
  // Updates an existing question category.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const validatedData = updateQuestionCategorySchema.parse(req.body);

    const updatedCategory =
      await feedbackQuestionService.updateQuestionCategory(id, validatedData);

    res.status(200).json({
      status: 'success',
      message: 'Question category updated successfully.',
      data: {
        category: updatedCategory,
      },
    });
  }
);

export const softDeleteQuestionCategory = asyncHandler(
  // Soft deletes a question category.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    await feedbackQuestionService.softDeleteQuestionCategory(id);

    res.status(204).json({
      status: 'success',
      message: 'Question category soft-deleted successfully.',
      data: null,
    });
  }
);

export const createFeedbackQuestion = asyncHandler(
  // Creates a new feedback question for a specific form.
  async (req: Request, res: Response) => {
    const { formId } = formIdParamSchema.parse(req.params);
    const validatedData = createFeedbackQuestionSchema.parse({
      ...req.body,
      formId,
    });

    const question =
      await feedbackQuestionService.createFeedbackQuestion(validatedData);

    res.status(201).json({
      status: 'success',
      message: 'Feedback question created successfully.',
      data: {
        question: question,
      },
    });
  }
);

export const updateFeedbackQuestion = asyncHandler(
  // Updates an existing feedback question.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const validatedData = updateFeedbackQuestionSchema.parse(req.body);

    const updatedQuestion =
      await feedbackQuestionService.updateFeedbackQuestion(id, validatedData);

    res.status(200).json({
      status: 'success',
      message: 'Feedback question updated successfully.',
      data: {
        question: updatedQuestion,
      },
    });
  }
);

export const softDeleteFeedbackQuestion = asyncHandler(
  // Soft deletes a feedback question.
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    await feedbackQuestionService.softDeleteFeedbackQuestion(id);

    res.status(204).json({
      status: 'success',
      message: 'Feedback question soft-deleted successfully.',
      data: null,
    });
  }
);

export const getFeedbackQuestionsByFormId = asyncHandler(
  // Retrieves active feedback questions for a specific form.
  async (req: Request, res: Response) => {
    const { formId } = formIdParamSchema.parse(req.params);

    const questions =
      await feedbackQuestionService.getFeedbackQuestionsByFormId(formId);

    res.status(200).json({
      status: 'success',
      results: questions.length,
      message: 'Feedback questions fetched successfully.',
      data: {
        questions: questions,
      },
    });
  }
);

export const batchUpdateFeedbackQuestions = asyncHandler(
  // Performs a batch update of feedback questions.
  async (req: Request, res: Response) => {
    const { questions } = batchUpdateFeedbackQuestionsSchema.parse(req.body);

    const updatedQuestions =
      await feedbackQuestionService.batchUpdateFeedbackQuestions(questions);

    res.status(200).json({
      status: 'success',
      message: 'Feedback questions batch updated successfully.',
      results: updatedQuestions.length,
      data: {
        questions: updatedQuestions,
      },
    });
  }
);
