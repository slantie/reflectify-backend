// src/controllers/feedbackQuestion/feedbackQuestion.controller.ts

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

/**
 * @description Retrieves all active question categories.
 * @route GET /api/v1/feedback-questions/categories
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD, AsstProf)
 */
export const getAllQuestionCategories = asyncHandler(
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

/**
 * @description Retrieves a single question category by ID.
 * @route GET /api/v1/feedback-questions/categories/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD, AsstProf)
 */
export const getQuestionCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    // Explicitly create an object with only 'id' from req.params to ensure only 'id' is validated.
    // This prevents other unexpected parameters like 'formId' from being caught by idParamSchema.
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

/**
 * @description Creates a new question category.
 * @route POST /api/v1/feedback-questions/categories
 * @param {Request} req - Express Request object (expects category data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const createQuestionCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData = createQuestionCategorySchema.parse(req.body); // Validate request body

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

/**
 * @description Updates an existing question category.
 * @route PATCH /api/v1/feedback-questions/categories/:id
 * @param {Request} req - Express Request object (expects id in params, partial category data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const updateQuestionCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params); // Validate ID
    const validatedData = updateQuestionCategorySchema.parse(req.body); // Validate request body

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

/**
 * @description Soft deletes a question category.
 * @route DELETE /api/v1/feedback-questions/categories/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const softDeleteQuestionCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params); // Validate ID

    await feedbackQuestionService.softDeleteQuestionCategory(id);

    res.status(204).json({
      status: 'success',
      message: 'Question category soft-deleted successfully.',
      data: null, // No content for 204
    });
  }
);

// --- Feedback Question Controller Methods ---

/**
 * @description Creates a new feedback question for a specific form.
 * @route POST /api/v1/feedback-questions/form/:formId/questions
 * @param {Request} req - Express Request object (expects formId in params, question data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const createFeedbackQuestion = asyncHandler(
  async (req: Request, res: Response) => {
    const { formId } = formIdParamSchema.parse(req.params); // Validate formId from params
    const validatedData = createFeedbackQuestionSchema.parse({
      ...req.body,
      formId,
    }); // Merge formId into validated data

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

/**
 * @description Updates an existing feedback question.
 * @route PATCH /api/v1/feedback-questions/questions/:id
 * @param {Request} req - Express Request object (expects id in params, partial question data in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const updateFeedbackQuestion = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params); // Validate ID
    const validatedData = updateFeedbackQuestionSchema.parse(req.body); // Validate request body

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

/**
 * @description Soft deletes a feedback question.
 * @route DELETE /api/v1/feedback-questions/questions/:id
 * @param {Request} req - Express Request object (expects id in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const softDeleteFeedbackQuestion = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params); // Validate ID

    await feedbackQuestionService.softDeleteFeedbackQuestion(id);

    res.status(204).json({
      status: 'success',
      message: 'Feedback question soft-deleted successfully.',
      data: null, // No content for 204
    });
  }
);

/**
 * @description Retrieves active feedback questions for a specific form.
 * @route GET /api/v1/feedback-questions/form/:formId/questions
 * @param {Request} req - Express Request object (expects formId in params)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD, AsstProf, Student)
 */
export const getFeedbackQuestionsByFormId = asyncHandler(
  async (req: Request, res: Response) => {
    const { formId } = formIdParamSchema.parse(req.params); // Validate formId

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

/**
 * @description Performs a batch update of feedback questions.
 * @route PATCH /api/v1/feedback-questions/questions/batch
 * @param {Request} req - Express Request object (expects { questions: FeedbackQuestionUpdateInput[] } in body)
 * @param {Response} res - Express Response object
 * @access Private (Admin, HOD)
 */
export const batchUpdateFeedbackQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const { questions } = batchUpdateFeedbackQuestionsSchema.parse(req.body); // Validate array of questions

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
