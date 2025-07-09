/**
 * @file src/services/feedbackQuestion/feedbackQuestion.service.ts
 * @description Service layer for Feedback Question operations.
 * Encapsulates business logic and interacts with the Prisma client.
 */

import { FeedbackQuestion, QuestionCategory, Prisma } from '@prisma/client';
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';

interface CreateQuestionCategoryInput {
  categoryName: string;
  description: string;
}

interface UpdateQuestionCategoryInput
  extends Partial<CreateQuestionCategoryInput> {
  isDeleted?: boolean;
}

interface CreateFeedbackQuestionInput {
  formId: string;
  categoryId: string;
  facultyId: string;
  subjectId: string;
  batch?: string;
  text: string;
  type: string;
  isRequired?: boolean;
  displayOrder: number;
}

interface UpdateFeedbackQuestionInput
  extends Partial<CreateFeedbackQuestionInput> {
  isDeleted?: boolean;
}

class FeedbackQuestionService {
  // Retrieves all active question categories.
  public async getAllQuestionCategories(): Promise<QuestionCategory[]> {
    try {
      const categories = await prisma.questionCategory.findMany({
        where: { isDeleted: false },
        include: { questions: { where: { isDeleted: false } } },
      });
      return categories;
    } catch (error: any) {
      console.error(
        'Error in FeedbackQuestionService.getAllQuestionCategories:',
        error
      );
      throw new AppError('Failed to retrieve question categories.', 500);
    }
  }

  // Retrieves a single active question category by its ID.
  public async getQuestionCategoryById(
    id: string
  ): Promise<QuestionCategory | null> {
    try {
      const category = await prisma.questionCategory.findUnique({
        where: { id: id, isDeleted: false },
        include: { questions: { where: { isDeleted: false } } },
      });
      return category;
    } catch (error: any) {
      console.error(
        `Error in FeedbackQuestionService.getQuestionCategoryById for ID ${id}:`,
        error
      );
      throw new AppError('Failed to retrieve question category.', 500);
    }
  }

  // Creates a new question category.
  public async createQuestionCategory(
    data: CreateQuestionCategoryInput
  ): Promise<QuestionCategory> {
    try {
      const newCategory = await prisma.questionCategory.create({
        data: {
          categoryName: data.categoryName,
          description: data.description,
          isDeleted: false,
        },
      });
      return newCategory;
    } catch (error: any) {
      console.error(
        'Error in FeedbackQuestionService.createQuestionCategory:',
        error
      );
      if (error.code === 'P2002') {
        throw new AppError(
          `Question category with name '${data.categoryName}' already exists.`,
          409
        );
      }
      throw new AppError('Failed to create question category.', 500);
    }
  }

  // Updates an existing question category.
  public async updateQuestionCategory(
    id: string,
    data: UpdateQuestionCategoryInput
  ): Promise<QuestionCategory> {
    try {
      const existingCategory = await prisma.questionCategory.findUnique({
        where: { id: id, isDeleted: false },
      });
      if (!existingCategory) {
        throw new AppError('Question category not found or is deleted.', 404);
      }

      const updatedCategory = await prisma.questionCategory.update({
        where: { id: id, isDeleted: false },
        data: data,
      });
      return updatedCategory;
    } catch (error: any) {
      console.error(
        `Error in FeedbackQuestionService.updateQuestionCategory for ID ${id}:`,
        error
      );
      if (error.code === 'P2025') {
        throw new AppError('Question category not found for update.', 404);
      }
      if (error.code === 'P2002') {
        throw new AppError(
          `Question category with name '${data.categoryName}' already exists.`,
          409
        );
      }
      throw new AppError('Failed to update question category.', 500);
    }
  }

  // Soft deletes a question category and all associated feedback questions.
  public async softDeleteQuestionCategory(
    id: string
  ): Promise<QuestionCategory> {
    try {
      const category = await prisma.$transaction(async (tx) => {
        const deletedCategory = await tx.questionCategory.update({
          where: { id: id, isDeleted: false },
          data: { isDeleted: true },
        });

        if (!deletedCategory) {
          throw new AppError('Question category not found for deletion.', 404);
        }

        await tx.feedbackQuestion.updateMany({
          where: { categoryId: id, isDeleted: false },
          data: { isDeleted: true },
        });

        return deletedCategory;
      });
      return category;
    } catch (error: any) {
      console.error(
        `Error in FeedbackQuestionService.softDeleteQuestionCategory for ID ${id}:`,
        error
      );
      if (error.code === 'P2025') {
        throw new AppError('Question category not found for deletion.', 404);
      }
      throw new AppError('Failed to soft delete question category.', 500);
    }
  }

  // Creates a new feedback question.
  public async createFeedbackQuestion(
    data: CreateFeedbackQuestionInput
  ): Promise<FeedbackQuestion> {
    const {
      formId,
      categoryId,
      facultyId,
      subjectId,
      batch,
      text,
      type,
      isRequired,
      displayOrder,
    } = data;

    const existingForm = await prisma.feedbackForm.findUnique({
      where: { id: formId, isDeleted: false },
    });
    if (!existingForm) {
      throw new AppError('Feedback Form not found or is deleted.', 400);
    }

    const existingCategory = await prisma.questionCategory.findUnique({
      where: { id: categoryId, isDeleted: false },
    });
    if (!existingCategory) {
      throw new AppError('Question Category not found or is deleted.', 400);
    }

    const existingFaculty = await prisma.faculty.findUnique({
      where: { id: facultyId, isDeleted: false },
    });
    if (!existingFaculty) {
      throw new AppError('Faculty not found or is deleted.', 400);
    }

    const existingSubject = await prisma.subject.findUnique({
      where: { id: subjectId, isDeleted: false },
    });
    if (!existingSubject) {
      throw new AppError('Subject not found or is deleted.', 400);
    }

    try {
      const question = await prisma.feedbackQuestion.create({
        data: {
          form: { connect: { id: formId } },
          category: { connect: { id: categoryId } },
          faculty: { connect: { id: facultyId } },
          subject: { connect: { id: subjectId } },
          batch,
          text,
          type,
          isRequired,
          displayOrder,
          isDeleted: false,
        },
        include: {
          form: true,
          category: true,
          faculty: true,
          subject: true,
        },
      });
      return question;
    } catch (error: any) {
      console.error(
        'Error in FeedbackQuestionService.createFeedbackQuestion:',
        error
      );
      throw new AppError('Failed to create feedback question.', 500);
    }
  }

  // Updates an existing feedback question.
  public async updateFeedbackQuestion(
    id: string,
    data: UpdateFeedbackQuestionInput
  ): Promise<FeedbackQuestion> {
    try {
      const existingQuestion = await prisma.feedbackQuestion.findUnique({
        where: { id: id, isDeleted: false },
      });
      if (!existingQuestion) {
        throw new AppError('Feedback question not found or is deleted.', 404);
      }

      const dataToUpdate: Prisma.FeedbackQuestionUpdateInput = { ...data };

      if (data.formId) {
        const form = await prisma.feedbackForm.findUnique({
          where: { id: data.formId, isDeleted: false },
        });
        if (!form)
          throw new AppError(
            'Provided form ID does not exist or is deleted.',
            400
          );
        dataToUpdate.form = { connect: { id: data.formId } };
      }
      if (data.categoryId) {
        const category = await prisma.questionCategory.findUnique({
          where: { id: data.categoryId, isDeleted: false },
        });
        if (!category)
          throw new AppError(
            'Provided category ID does not exist or is deleted.',
            400
          );
        dataToUpdate.category = { connect: { id: data.categoryId } };
      }
      if (data.facultyId) {
        const faculty = await prisma.faculty.findUnique({
          where: { id: data.facultyId, isDeleted: false },
        });
        if (!faculty)
          throw new AppError(
            'Provided faculty ID does not exist or is deleted.',
            400
          );
        dataToUpdate.faculty = { connect: { id: data.facultyId } };
      }
      if (data.subjectId) {
        const subject = await prisma.subject.findUnique({
          where: { id: data.subjectId, isDeleted: false },
        });
        if (!subject)
          throw new AppError(
            'Provided subject ID does not exist or is deleted.',
            400
          );
        dataToUpdate.subject = { connect: { id: data.subjectId } };
      }

      delete (dataToUpdate as any).formId;
      delete (dataToUpdate as any).categoryId;
      delete (dataToUpdate as any).facultyId;
      delete (dataToUpdate as any).subjectId;

      const updatedQuestion = await prisma.feedbackQuestion.update({
        where: { id: id, isDeleted: false },
        data: dataToUpdate,
        include: {
          form: true,
          category: true,
          faculty: true,
          subject: true,
        },
      });
      return updatedQuestion;
    } catch (error: any) {
      console.error(
        `Error in FeedbackQuestionService.updateFeedbackQuestion for ID ${id}:`,
        error
      );
      if (error.code === 'P2025') {
        throw new AppError('Feedback question not found for update.', 404);
      }
      throw new AppError('Failed to update feedback question.', 500);
    }
  }

  // Soft deletes a feedback question and associated student responses and snapshots.
  public async softDeleteFeedbackQuestion(
    id: string
  ): Promise<FeedbackQuestion> {
    try {
      const question = await prisma.$transaction(async (tx) => {
        const deletedQuestion = await tx.feedbackQuestion.update({
          where: { id: id, isDeleted: false },
          data: { isDeleted: true },
        });

        if (!deletedQuestion) {
          throw new AppError('Feedback question not found for deletion.', 404);
        }

        await tx.studentResponse.updateMany({
          where: { questionId: id, isDeleted: false },
          data: { isDeleted: true },
        });

        await tx.feedbackSnapshot.updateMany({
          where: {
            OR: [
              { questionId: id },
              {
                originalStudentResponseId: {
                  in: (
                    await tx.studentResponse.findMany({
                      where: { questionId: id },
                      select: { id: true },
                    })
                  ).map((sr) => sr.id),
                },
              },
            ],
          },
          data: {
            formDeleted: true,
          },
        });

        return deletedQuestion;
      });
      return question;
    } catch (error: any) {
      console.error(
        `Error in FeedbackQuestionService.softDeleteFeedbackQuestion for ID ${id}:`,
        error
      );
      if (error.code === 'P2025') {
        throw new AppError('Feedback question not found for deletion.', 404);
      }
      throw new AppError('Failed to soft delete feedback question.', 500);
    }
  }

  // Retrieves active feedback questions by form ID.
  public async getFeedbackQuestionsByFormId(
    formId: string
  ): Promise<FeedbackQuestion[]> {
    try {
      const existingForm = await prisma.feedbackForm.findUnique({
        where: { id: formId, isDeleted: false },
      });
      if (!existingForm) {
        throw new AppError('Feedback Form not found or is deleted.', 404);
      }

      const questions = await prisma.feedbackQuestion.findMany({
        where: {
          formId: formId,
          isDeleted: false,
          category: { isDeleted: false },
          faculty: { isDeleted: false },
          subject: { isDeleted: false },
        },
        include: {
          category: true,
          faculty: true,
          subject: true,
        },
        orderBy: {
          displayOrder: 'asc',
        },
      });
      return questions;
    } catch (error: any) {
      console.error(
        `Error in FeedbackQuestionService.getFeedbackQuestionsByFormId for form ID ${formId}:`,
        error
      );
      throw new AppError(
        'Failed to retrieve feedback questions by form ID.',
        500
      );
    }
  }

  // Performs a batch update of feedback questions.
  public async batchUpdateFeedbackQuestions(
    questionsData: Array<{ id: string } & Partial<CreateFeedbackQuestionInput>>
  ): Promise<FeedbackQuestion[]> {
    const results: FeedbackQuestion[] = [];

    try {
      const transactionResults = await prisma.$transaction(
        questionsData.map((questionData) => {
          const {
            id,
            formId,
            categoryId,
            facultyId,
            subjectId,
            ...restOfData
          } = questionData;

          const dataToUpdate: Prisma.FeedbackQuestionUpdateInput = {
            ...restOfData,
          };

          if (formId) dataToUpdate.form = { connect: { id: formId } };
          if (categoryId)
            dataToUpdate.category = { connect: { id: categoryId } };
          if (facultyId) dataToUpdate.faculty = { connect: { id: facultyId } };
          if (subjectId) dataToUpdate.subject = { connect: { id: subjectId } };

          delete (dataToUpdate as any).formId;
          delete (dataToUpdate as any).categoryId;
          delete (dataToUpdate as any).facultyId;
          delete (dataToUpdate as any).subjectId;

          return prisma.feedbackQuestion.update({
            where: { id: id, isDeleted: false },
            data: dataToUpdate,
            include: {
              form: true,
              category: true,
              faculty: true,
              subject: true,
            },
          });
        })
      );
      results.push(...transactionResults);
      return results;
    } catch (error: any) {
      console.error(
        'Error in FeedbackQuestionService.batchUpdateFeedbackQuestions:',
        error
      );
      if (error.code === 'P2025') {
        throw new AppError(
          'One or more feedback questions not found or are deleted for batch update.',
          404
        );
      }
      throw new AppError('Failed to batch update feedback questions.', 500);
    }
  }
}

export const feedbackQuestionService = new FeedbackQuestionService();
