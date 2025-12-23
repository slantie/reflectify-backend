/**
 * @file src/services/overrideStudents/overrideStudents.service.ts
 * @description Service layer for Override Student operations.
 * Handles student data upload, retrieval, and management for specific feedback forms.
 */

import { OverrideStudent, FeedbackFormOverride } from '@prisma/client';
import ExcelJS from 'exceljs';
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';
import { overrideStudentExcelRowSchema } from '../../utils/validators/overrideStudents.validation';

interface OverrideStudentUploadResult {
  message: string;
  rowsAffected: number;
  skippedRows: number;
  skippedDetails: string[];
}

interface UpdateOverrideStudentInput {
  name?: string;
  email?: string;
  enrollmentNumber?: string;
  batch?: string;
  phoneNumber?: string;
  department?: string;
  semester?: string;
}

interface PaginationOptions {
  page: number;
  limit: number;
}

interface PaginatedOverrideStudents {
  students: OverrideStudent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class OverrideStudentsService {
  // Extracts the string value from an ExcelJS cell.
  private getCellValue(cell: ExcelJS.Cell): string {
    const value = cell.value;
    if (
      value &&
      typeof value === 'object' &&
      'hyperlink' in value &&
      'text' in value
    ) {
      return value.text?.toString() || '';
    }
    return value?.toString() || '';
  }

  // Validates that a feedback form exists and is not deleted.
  private async validateFeedbackForm(formId: string): Promise<void> {
    const form = await prisma.feedbackForm.findUnique({
      where: { id: formId, isDeleted: false },
    });

    if (!form) {
      throw new AppError('Feedback form not found or is deleted.', 404);
    }
  }

  // Ensures that a FeedbackFormOverride record exists for the given form.
  private async ensureFeedbackFormOverride(
    formId: string,
    uploadedBy: string
  ): Promise<FeedbackFormOverride> {
    let override = await prisma.feedbackFormOverride.findFirst({
      where: { feedbackFormId: formId, isDeleted: false },
    });

    if (!override) {
      override = await prisma.feedbackFormOverride.create({
        data: {
          feedbackFormId: formId,
          uploadedBy: uploadedBy,
          isDeleted: false,
        },
      });
    }

    return override;
  }

  // Processes an Excel/CSV file containing override student data.
  public async uploadOverrideStudents(
    formId: string,
    fileBuffer: Buffer,
    uploadedBy: string
  ): Promise<OverrideStudentUploadResult> {
    let skippedRowsDetails: string[] = [];
    let addedRows = 0;
    let skippedCount = 0;

    try {
      await this.validateFeedbackForm(formId);

      const override = await this.ensureFeedbackFormOverride(
        formId,
        uploadedBy
      );

      await prisma.overrideStudent.updateMany({
        where: { feedbackFormOverrideId: override.id },
        data: { isDeleted: true },
      });

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        throw new AppError(
          'Invalid worksheet: Worksheet not found in the Excel file.',
          400
        );
      }

      const emailSet = new Set<string>();

      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);

        if (!row.hasValues) {
          continue;
        }

        const rawData = {
          studentName: this.getCellValue(row.getCell(1)),
          email: this.getCellValue(row.getCell(2)),
          enrollmentNumber: this.getCellValue(row.getCell(3)),
          batch: this.getCellValue(row.getCell(4)),
          phoneNumber: this.getCellValue(row.getCell(5)),
          department: this.getCellValue(row.getCell(6)),
          semester: this.getCellValue(row.getCell(7)),
        };

        const validationResult =
          overrideStudentExcelRowSchema.safeParse(rawData);

        if (!validationResult.success) {
          const errors = validationResult.error.errors
            .map((err) => `${err.path.join('.')}: ${err.message}`)
            .join(', ');
          const message = `Row ${rowNumber}: Skipping due to validation errors: ${errors}. Email: '${rawData.email}'.`;
          console.warn(message);
          skippedRowsDetails.push(message);
          skippedCount++;
          continue;
        }

        const validatedData = validationResult.data;
        const {
          studentName,
          email,
          enrollmentNumber,
          batch,
          phoneNumber,
          department,
          semester,
        } = validatedData;

        try {
          if (emailSet.has(email)) {
            const message = `Row ${rowNumber}: Skipping duplicate email '${email}' within the same upload.`;
            console.warn(message);
            skippedRowsDetails.push(message);
            skippedCount++;
            continue;
          }

          const existingOverrideStudent =
            await prisma.overrideStudent.findUnique({
              where: {
                email_feedbackFormOverrideId: {
                  email: email,
                  feedbackFormOverrideId: override.id,
                },
              },
            });

          if (existingOverrideStudent && !existingOverrideStudent.isDeleted) {
            const message = `Row ${rowNumber}: Student with email '${email}' already exists for this form override.`;
            console.warn(message);
            skippedRowsDetails.push(message);
            skippedCount++;
            continue;
          }

          emailSet.add(email);

          if (existingOverrideStudent && existingOverrideStudent.isDeleted) {
            await prisma.overrideStudent.update({
              where: { id: existingOverrideStudent.id },
              data: {
                name: studentName,
                enrollmentNumber: enrollmentNumber,
                batch: batch,
                phoneNumber: phoneNumber,
                department: department,
                semester: semester,
                isDeleted: false,
              },
            });
            addedRows++;
          } else {
            await prisma.overrideStudent.create({
              data: {
                feedbackFormOverrideId: override.id,
                name: studentName,
                email: email,
                enrollmentNumber: enrollmentNumber,
                batch: batch,
                phoneNumber: phoneNumber,
                department: department,
                semester: semester,
                isDeleted: false,
              },
            });
            addedRows++;
          }
        } catch (innerError: any) {
          const message = `Row ${rowNumber}: Error processing data for Email '${email}': ${innerError.message || 'Unknown error'}.`;
          console.error(message, innerError);
          skippedRowsDetails.push(message);
          skippedCount++;
        }
      }

      return {
        message: 'Override students data processing complete.',
        rowsAffected: addedRows,
        skippedRows: skippedCount,
        skippedDetails: skippedRowsDetails,
      };
    } catch (error: any) {
      console.error(
        'Error in OverrideStudentsService.uploadOverrideStudents:',
        error
      );
      throw new AppError(
        error.message || 'Error processing override students data.',
        500
      );
    }
  }

  // Retrieves all override students for a specific feedback form with pagination.
  public async getOverrideStudents(
    formId: string,
    options: PaginationOptions
  ): Promise<PaginatedOverrideStudents> {
    try {
      await this.validateFeedbackForm(formId);

      const override = await prisma.feedbackFormOverride.findFirst({
        where: { feedbackFormId: formId, isDeleted: false },
      });

      if (!override) {
        return {
          students: [],
          pagination: {
            page: options.page,
            limit: options.limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
      }

      const { page, limit } = options;
      const skip = (page - 1) * limit;

      const total = await prisma.overrideStudent.count({
        where: {
          feedbackFormOverrideId: override.id,
          isDeleted: false,
        },
      });

      const students = await prisma.overrideStudent.findMany({
        where: {
          feedbackFormOverrideId: override.id,
          isDeleted: false,
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      return {
        students,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error: any) {
      console.error(
        'Error in OverrideStudentsService.getOverrideStudents:',
        error
      );
      throw new AppError(
        error.message || 'Error retrieving override students.',
        500
      );
    }
  }

  // Retrieves all override students for a specific feedback form without pagination.
  public async getAllOverrideStudents(
    formId: string
  ): Promise<OverrideStudent[]> {
    try {
      await this.validateFeedbackForm(formId);

      const override = await prisma.feedbackFormOverride.findFirst({
        where: { feedbackFormId: formId, isDeleted: false },
      });

      if (!override) {
        return [];
      }

      const students = await prisma.overrideStudent.findMany({
        where: {
          feedbackFormOverrideId: override.id,
          isDeleted: false,
        },
        orderBy: { name: 'asc' },
      });

      return students;
    } catch (error: any) {
      console.error(
        'Error in OverrideStudentsService.getAllOverrideStudents:',
        error
      );
      throw new AppError(
        error.message || 'Error retrieving override students.',
        500
      );
    }
  }

  // Updates an override student.
  public async updateOverrideStudent(
    formId: string,
    studentId: string,
    updateData: UpdateOverrideStudentInput
  ): Promise<OverrideStudent> {
    try {
      await this.validateFeedbackForm(formId);

      const override = await prisma.feedbackFormOverride.findFirst({
        where: { feedbackFormId: formId, isDeleted: false },
      });

      if (!override) {
        throw new AppError('No override students found for this form.', 404);
      }

      const existingStudent = await prisma.overrideStudent.findUnique({
        where: {
          id: studentId,
          feedbackFormOverrideId: override.id,
          isDeleted: false,
        },
      });

      if (!existingStudent) {
        throw new AppError('Override student not found.', 404);
      }

      if (updateData.email && updateData.email !== existingStudent.email) {
        const duplicateEmail = await prisma.overrideStudent.findUnique({
          where: {
            email_feedbackFormOverrideId: {
              email: updateData.email,
              feedbackFormOverrideId: override.id,
            },
          },
        });

        if (duplicateEmail && duplicateEmail.id !== studentId) {
          throw new AppError(
            'Another student with this email already exists for this form.',
            400
          );
        }
      }

      const updatedStudent = await prisma.overrideStudent.update({
        where: { id: studentId },
        data: updateData,
      });

      return updatedStudent;
    } catch (error: any) {
      console.error(
        'Error in OverrideStudentsService.updateOverrideStudent:',
        error
      );
      throw new AppError(
        error.message || 'Error updating override student.',
        500
      );
    }
  }

  // Deletes an override student (soft delete).
  public async deleteOverrideStudent(
    formId: string,
    studentId: string
  ): Promise<void> {
    try {
      await this.validateFeedbackForm(formId);

      const override = await prisma.feedbackFormOverride.findFirst({
        where: { feedbackFormId: formId, isDeleted: false },
      });

      if (!override) {
        throw new AppError('No override students found for this form.', 404);
      }

      const existingStudent = await prisma.overrideStudent.findUnique({
        where: {
          id: studentId,
          feedbackFormOverrideId: override.id,
          isDeleted: false,
        },
      });

      if (!existingStudent) {
        throw new AppError('Override student not found.', 404);
      }

      await prisma.overrideStudent.update({
        where: { id: studentId },
        data: { isDeleted: true },
      });
    } catch (error: any) {
      console.error(
        'Error in OverrideStudentsService.deleteOverrideStudent:',
        error
      );
      throw new AppError(
        error.message || 'Error deleting override student.',
        500
      );
    }
  }

  // Clears all override students for a feedback form.
  public async clearOverrideStudents(formId: string): Promise<number> {
    try {
      await this.validateFeedbackForm(formId);

      const override = await prisma.feedbackFormOverride.findFirst({
        where: { feedbackFormId: formId, isDeleted: false },
      });

      if (!override) {
        return 0;
      }

      const count = await prisma.overrideStudent.count({
        where: {
          feedbackFormOverrideId: override.id,
          isDeleted: false,
        },
      });

      await prisma.overrideStudent.updateMany({
        where: {
          feedbackFormOverrideId: override.id,
          isDeleted: false,
        },
        data: { isDeleted: true },
      });

      return count;
    } catch (error: any) {
      console.error(
        'Error in OverrideStudentsService.clearOverrideStudents:',
        error
      );
      throw new AppError(
        error.message || 'Error clearing override students.',
        500
      );
    }
  }
}

export const overrideStudentsService = new OverrideStudentsService();
