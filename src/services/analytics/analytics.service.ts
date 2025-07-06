/**
 * @file src/services/analytics/analytics.service.ts
 * @description Service layer for feedback analytics operations.
 * Encapsulates business logic and interacts with the Prisma client.
 */

import {
  Prisma,
  LectureType,
} from '@prisma/client';
import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError';

// Define output types directly within the service file
interface OverallSemesterRatingOutput {
  semesterId: string;
  averageRating: number;
  totalResponses: number;
}

interface SemesterWithResponsesOutput {
  id: string;
  semesterNumber: number;
  academicYear: {
    id: string;
    yearString: string;
  };
}

interface SubjectWiseRatingOutput {
  subject: string;
  lectureType: LectureType;
  averageRating: number;
  responseCount: number;
}

interface HighImpactFeedbackAreaOutput {
  question: string;
  category: string;
  faculty: string;
  subject: string;
  lowRatingCount: number; // This will now correctly represent responses below threshold
  averageRating: number; // This will be the average of all responses for the question
}

interface SemesterTrendAnalysisOutput {
  semester: number;
  subject: string;
  averageRating: number;
  responseCount: number;
  // academicYear?: string; // Optional, if you decide to include it from the original code
}

interface AnnualPerformanceTrendOutput {
  year: number;
  averageRating: number;
  completionRate: number;
}

interface DivisionBatchComparisonOutput {
  division: string;
  batch: string;
  averageRating: number;
  responseCount: number;
}

interface LabLectureComparisonOutput {
  lectureType: LectureType;
  averageRating: number;
  responseCount: number;
  formCount: number;
}

// Output types for faculty performance data
interface FacultyPerformanceYearDataOutput {
  Faculty_name: string;
  academic_year: string;
  total_average: number | null;
  [key: string]: string | number | null; // For semester 1, semester 2, etc.
}

interface AllFacultyPerformanceDataOutput {
  academic_year: string;
  faculties: Array<FacultyPerformanceYearDataOutput & { facultyId: string }>;
}

// NEW: Output type for getSemesterDivisions
interface SemesterDivisionDetails {
  divisionId: string;
  divisionName: string;
  studentCount: number;
  responseCount: number;
}

interface SemesterDivisionResponseOutput {
  semesterId: string;
  semesterNumber: number;
  academicYear: {
    id: string;
    yearString: string;
  };
  divisions: SemesterDivisionDetails[];
}

class AnalyticsService {
  /**
   * Helper function to group an array of objects by a specified key.
   * @param array - The array to group.
   * @param key - A function that returns the key for each item.
   * @returns A record where keys are group keys and values are arrays of items.
   * @private
   */
  private groupBy<T>(
    array: T[],
    key: (item: T) => string
  ): Record<string, T[]> {
    return array.reduce(
      (groups, item) => {
        const groupKey = key(item);
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(item);
        return groups;
      },
      {} as Record<string, T[]>
    );
  }

  /**
   * Helper function to parse raw response value into a numeric score.
   * Handles cases where the value might be a string number, a JSON string with a 'score' field,
   * or a direct number/object with a 'score' field.
   * @param rawResponseValue - The raw value from the database (JSON field).
   * @returns The numeric score, or null if parsing fails.
   * @private
   */
  private parseResponseValueToScore(rawResponseValue: any): number | null {
    let score: number | null = null;

    if (typeof rawResponseValue === 'string') {
      // Case 1: The JSON value is a direct string number (e.g., "6")
      const parsedFloat = parseFloat(rawResponseValue);
      if (!isNaN(parsedFloat)) {
        score = parsedFloat;
      } else {
        // If it's a string but not a direct number, try parsing as JSON object/number
        try {
          const parsedJson = JSON.parse(rawResponseValue);
          if (
            typeof parsedJson === 'object' &&
            parsedJson !== null &&
            'score' in parsedJson &&
            typeof (parsedJson as any).score === 'number'
          ) {
            score = (parsedJson as any).score;
          } else if (typeof parsedJson === 'number') {
            score = parsedJson;
          }
        } catch (e) {
          // console.warn(`Could not parse rawResponseValue as JSON string: ${rawResponseValue}`);
        }
      }
    }
    // Case 2: The JSON value is already a JS object (e.g., { "score": 5 })
    else if (
      typeof rawResponseValue === 'object' &&
      rawResponseValue !== null &&
      'score' in rawResponseValue &&
      typeof (rawResponseValue as any).score === 'number'
    ) {
      score = (rawResponseValue as any).score;
    }
    // Case 3: The JSON value is already a direct number
    else if (typeof rawResponseValue === 'number') {
      score = rawResponseValue;
    }

    return typeof score === 'number' && !isNaN(score) ? score : null;
  }

  /**
   * Calculates the overall average rating for a specific semester,
   * with optional filtering by division and student batch.
   * Filters out soft-deleted records at all levels.
   * @param semesterId - The ID of the semester.
   * @param divisionId - Optional ID of the division to filter by.
   * @param batch - Optional student batch to filter by.
   * @returns The overall average rating and total responses.
   * @throws AppError if no responses are found.
   */
  public async getOverallSemesterRating(
    semesterId: string,
    divisionId?: string,
    batch?: string
  ): Promise<OverallSemesterRatingOutput> {
    try {
      const whereClause: Prisma.StudentResponseWhereInput = {
        isDeleted: false, // Filter out soft-deleted student responses
        form: {
          isDeleted: false, // Ensure form is not soft-deleted
          subjectAllocation: {
            isDeleted: false, // Ensure subject allocation is not soft-deleted
            semesterId,
            semester: { isDeleted: false }, // Ensure semester is not soft-deleted
          },
          division: {
            isDeleted: false, // Ensure division is not soft-deleted
            ...(divisionId && { id: divisionId }), // Apply divisionId filter if present
          },
        },
        student: {
          isDeleted: false, // Ensure student is not soft-deleted
          ...(batch && { batch }), // Apply batch filter if present
        },
      };

      const responses = await prisma.studentResponse.findMany({
        where: whereClause,
        select: {
          value: true,
        },
      });

      if (!responses.length) {
        throw new AppError(
          'No responses found for the given semester and filters.',
          404
        );
      }

      // Parse values to numbers and filter out non-numeric results
      const numericResponses = responses
        .map((r) => parseFloat(String(r.value))) // Convert to string first, then parse
        .filter((value) => !isNaN(value)); // Filter out NaN values

      if (numericResponses.length === 0) {
        throw new AppError('No numeric responses found for calculation.', 404);
      }

      const averageRating =
        numericResponses.reduce((acc, r) => acc + r, 0) /
        numericResponses.length;

      return {
        semesterId,
        averageRating: Number(averageRating.toFixed(2)),
        totalResponses: responses.length,
      };
    } catch (error: any) {
      console.error(
        'Error in AnalyticsService.getOverallSemesterRating:',
        error
      );
      throw error; // Re-throw AppError or wrap other errors
    }
  }

  /**
   * Retrieves a list of semesters that have associated feedback responses.
   * Filters out soft-deleted records.
   * @returns An array of semesters with their academic year.
   */
  public async getSemestersWithResponses(): Promise<
    SemesterWithResponsesOutput[]
  > {
    try {
      const semestersWithResponses = await prisma.semester.findMany({
        where: {
          isDeleted: false, // Filter out soft-deleted semesters
          academicYear: { isDeleted: false }, // Ensure academic year is not soft-deleted
          allocations: {
            some: {
              isDeleted: false, // Ensure subject allocation is not soft-deleted
              feedbackForms: {
                some: {
                  isDeleted: false, // Ensure feedback form is not soft-deleted
                  responses: {
                    some: {
                      isDeleted: false, // Ensure student response is not soft-deleted
                    },
                  },
                },
              },
            },
          },
        },
        select: {
          id: true,
          semesterNumber: true,
          academicYear: {
            select: {
              id: true,
              yearString: true,
            },
          },
        },
        orderBy: {
          semesterNumber: 'desc',
        },
      });
      return semestersWithResponses as SemesterWithResponsesOutput[];
    } catch (error: any) {
      console.error(
        'Error in AnalyticsService.getSemestersWithResponses:',
        error
      );
      throw new AppError('Failed to retrieve semesters with responses.', 500);
    }
  }

  /**
   * Calculates subject-wise ratings for a given semester, broken down by lecture type.
   * Filters out soft-deleted records.
   * @param semesterId - The ID of the semester.
   * @returns An array of subject-wise ratings.
   * @throws AppError if no feedback data is found.
   */
  public async getSubjectWiseLectureLabRating(
    semesterId: string
  ): Promise<SubjectWiseRatingOutput[]> {
    try {
      const forms = await prisma.feedbackForm.findMany({
        where: {
          isDeleted: false, // Filter out soft-deleted forms
          subjectAllocation: {
            isDeleted: false, // Filter out soft-deleted allocations
            semesterId,
            semester: { isDeleted: false }, // Ensure semester is not soft-deleted
            subject: { isDeleted: false }, // Ensure subject is not soft-deleted
          },
        },
        include: {
          subjectAllocation: {
            select: {
              subject: { select: { name: true } },
              lectureType: true,
            },
          },
          questions: {
            where: { isDeleted: false }, // Filter out soft-deleted questions
            include: {
              responses: {
                where: { isDeleted: false }, // Filter out soft-deleted responses
                select: {
                  value: true,
                },
              },
            },
          },
        },
      });

      if (!forms.length) {
        throw new AppError(
          'No feedback data found for the given semester.',
          404
        );
      }

      const subjectRatings: SubjectWiseRatingOutput[] = forms.map((form) => {
        const responses = form.questions.flatMap((q) => q.responses);
        const numericResponses = responses
          .map((r) => parseFloat(String(r.value))) // Parse value to number
          .filter((value) => !isNaN(value)); // Filter out NaN values

        const avgRating =
          numericResponses.length > 0
            ? numericResponses.reduce((acc, r) => acc + r, 0) /
              numericResponses.length
            : 0;

        return {
          subject: form.subjectAllocation.subject.name,
          lectureType: form.subjectAllocation.lectureType,
          averageRating: Number(avgRating.toFixed(2)),
          responseCount: responses.length,
        };
      });

      return subjectRatings;
    } catch (error: any) {
      console.error(
        'Error in AnalyticsService.getSubjectWiseLectureLabRating:',
        error
      );
      throw error;
    }
  }

  /**
   * Identifies high-impact feedback areas (questions with significant low ratings) for a given semester.
   * Filters out soft-deleted records.
   * @param semesterId - The ID of the semester.
   * @returns An array of high-impact feedback areas.
   * @throws AppError if no significant low-rated areas are found.
   */
  public async getHighImpactFeedbackAreas(
    semesterId: string
  ): Promise<HighImpactFeedbackAreaOutput[]> {
    try {
      const LOW_RATING_THRESHOLD = 3;
      const SIGNIFICANT_COUNT = 5;

      const questionsWithResponses = await prisma.feedbackQuestion.findMany({
        where: {
          isDeleted: false, // Filter out soft-deleted questions
          form: {
            isDeleted: false, // Ensure form is not soft-deleted
            subjectAllocation: {
              isDeleted: false, // Ensure subject allocation is not soft-deleted
              semesterId,
              semester: { isDeleted: false }, // Ensure semester is not soft-deleted
            },
          },
          category: { isDeleted: false }, // Ensure category is not soft-deleted
          faculty: { isDeleted: false }, // Ensure faculty is not soft-deleted
          subject: { isDeleted: false }, // Ensure subject is not soft-deleted
        },
        include: {
          responses: {
            where: {
              isDeleted: false, // Filter out soft-deleted responses
            },
            select: { value: true }, // Only need the value for calculation
          },
          category: true, // Include the entire category object
          faculty: true, // Include the entire faculty object
          subject: true, // Include the entire subject object
        },
      });

      const significantLowRatedQuestions: HighImpactFeedbackAreaOutput[] = [];

      for (const question of questionsWithResponses) {
        const numericResponses = question.responses
          .map((r) => parseFloat(String(r.value)))
          .filter((value) => !isNaN(value));

        const lowRatedResponses = numericResponses.filter(
          (val) => val < LOW_RATING_THRESHOLD
        );

        if (lowRatedResponses.length >= SIGNIFICANT_COUNT) {
          const averageRating =
            numericResponses.length > 0
              ? numericResponses.reduce((acc, r) => acc + r, 0) /
                numericResponses.length
              : 0;

          significantLowRatedQuestions.push({
            question: question.text,
            category: question.category?.categoryName || 'N/A',
            faculty: question.faculty?.name || 'N/A',
            subject: question.subject?.name || 'N/A',
            lowRatingCount: lowRatedResponses.length, // Correctly reflects count below threshold
            averageRating: Number(averageRating.toFixed(2)), // Average of all valid responses for the question
          });
        }
      }

      if (!significantLowRatedQuestions.length) {
        throw new AppError('No significant low-rated areas found.', 404);
      }

      return significantLowRatedQuestions;
    } catch (error: any) {
      console.error(
        'Error in AnalyticsService.getHighImpactFeedbackAreas:',
        error
      );
      throw error;
    }
  }

  /**
   * Provides trend analysis of average ratings across semesters, optionally filtered by subject.
   * Filters out soft-deleted records.
   * @param subjectId - Optional ID of the subject to filter by.
   * @returns An array of trend data.
   * @throws AppError if no trend data is available.
   */
  public async getSemesterTrendAnalysis(
    subjectId?: string
  ): Promise<SemesterTrendAnalysisOutput[]> {
    try {
      const whereClause: Prisma.FeedbackFormWhereInput = {
        isDeleted: false, // Filter out soft-deleted forms
        subjectAllocation: {
          isDeleted: false, // Ensure subject allocation is not soft-deleted
          semester: { isDeleted: false }, // Ensure semester is not soft-deleted
          subject: {
            isDeleted: false, // Ensure subject is not soft-deleted
            ...(subjectId && { id: subjectId }), // Apply subjectId filter if present
          },
        },
      };

      const trends = await prisma.feedbackForm.findMany({
        where: whereClause,
        include: {
          subjectAllocation: {
            select: {
              semester: {
                select: {
                  semesterNumber: true,
                  academicYear: { select: { yearString: true } },
                },
              },
              subject: { select: { name: true } },
            },
          },
          questions: {
            where: { isDeleted: false }, // Filter out soft-deleted questions
            include: {
              responses: {
                where: { isDeleted: false }, // Filter out soft-deleted responses
                select: {
                  value: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (!trends.length) {
        throw new AppError(
          'No trend data available for the given criteria.',
          404
        );
      }

      const enrichedTrends: SemesterTrendAnalysisOutput[] = trends.map(
        (form) => {
          const responses = form.questions.flatMap((q) => q.responses);
          const numericResponses = responses
            .map((r) => parseFloat(String(r.value))) // Parse value to number
            .filter((value) => !isNaN(value)); // Filter out NaN values

          const avgRating =
            numericResponses.length > 0
              ? numericResponses.reduce((acc, r) => acc + r, 0) /
                numericResponses.length
              : 0;

          return {
            semester: form.subjectAllocation.semester.semesterNumber,
            subject: form.subjectAllocation.subject.name,
            averageRating: Number(avgRating.toFixed(2)),
            responseCount: responses.length,
            // academicYear: form.subjectAllocation.semester.academicYear.yearString, // Uncomment if needed
          };
        }
      );

      return enrichedTrends;
    } catch (error: any) {
      console.error(
        'Error in AnalyticsService.getSemesterTrendAnalysis:',
        error
      );
      throw error;
    }
  }

  /**
   * Retrieves annual performance trends based on aggregated feedback analytics.
   * Filters out soft-deleted analytics records.
   * @returns An array of annual performance trend data.
   * @throws AppError if no annual performance data is available.
   */
  public async getAnnualPerformanceTrend(): Promise<
    AnnualPerformanceTrendOutput[]
  > {
    try {
      const annualTrends = await prisma.feedbackAnalytics.groupBy({
        by: ['calculatedAt'], // Group by the timestamp of calculation
        where: { isDeleted: false }, // Filter out soft-deleted analytics
        _avg: {
          averageRating: true,
          completionRate: true,
        },
        orderBy: {
          calculatedAt: 'asc',
        },
      });

      if (!annualTrends.length) {
        throw new AppError('No annual performance data available.', 404);
      }

      const formattedTrends: AnnualPerformanceTrendOutput[] = annualTrends.map(
        (trend) => ({
          year: new Date(trend.calculatedAt).getFullYear(),
          averageRating: Number(trend._avg.averageRating?.toFixed(2) ?? 0),
          completionRate: Number(trend._avg.completionRate?.toFixed(2) ?? 0),
        })
      );

      return formattedTrends;
    } catch (error: any) {
      console.error(
        'Error in AnalyticsService.getAnnualPerformanceTrend:',
        error
      );
      // Log the full error object for better debugging
      console.error('Full error details:', JSON.stringify(error, null, 2));

      // Provide a more specific error message if it's a PrismaClientKnownRequestError
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new AppError(
          `Database error during annual trend analysis: ${error.message} (Code: ${error.code})`,
          500
        );
      }
      throw new AppError('Error analyzing annual performance trends.', 500);
    }
  }

  /**
   * Compares average ratings across different divisions and batches for a given semester.
   * Filters out soft-deleted records.
   * @param semesterId - The ID of the semester.
   * @returns An array of comparison data.
   * @throws AppError if no comparison data is available.
   */
  public async getDivisionBatchComparisons(
    semesterId: string
  ): Promise<DivisionBatchComparisonOutput[]> {
    try {
      const forms = await prisma.feedbackForm.findMany({
        where: {
          isDeleted: false, // Filter out soft-deleted forms
          subjectAllocation: {
            isDeleted: false, // Ensure subject allocation is not soft-deleted
            semesterId,
            semester: { isDeleted: false }, // Ensure semester is not soft-deleted
          },
          division: { isDeleted: false }, // Ensure division is not soft-deleted
        },
        include: {
          division: { select: { divisionName: true } },
          questions: {
            where: { isDeleted: false }, // Filter out soft-deleted questions
            include: {
              responses: {
                where: { isDeleted: false }, // Filter out soft-deleted responses
                select: {
                  value: true,
                  student: { select: { batch: true, isDeleted: true } }, // Include isDeleted for filtering
                },
              },
            },
          },
        },
      });

      if (!forms.length) {
        throw new AppError(
          'No comparison data available for the given semester.',
          404
        );
      }

      const comparisonData: DivisionBatchComparisonOutput[] = [];

      forms.forEach((form) => {
        const responses = form.questions.flatMap((q) => q.responses);
        // Filter out responses from soft-deleted students before grouping
        const activeResponses = responses.filter(
          (r) => r.student && !r.student.isDeleted
        );

        const batchGroups = this.groupBy(
          activeResponses,
          (r) => r.student?.batch || 'Unknown'
        );

        Object.entries(batchGroups).forEach(([batch, batchResponses]) => {
          const numericBatchResponses = batchResponses
            .map((r) => parseFloat(String(r.value))) // Parse value to number
            .filter((value) => !isNaN(value)); // Filter out NaN values

          const avgRating =
            numericBatchResponses.length > 0
              ? numericBatchResponses.reduce((sum, r) => sum + r, 0) /
                numericBatchResponses.length
              : 0;

          comparisonData.push({
            division: form.division.divisionName,
            batch,
            averageRating: Number(avgRating.toFixed(2)),
            responseCount: batchResponses.length,
          });
        });
      });

      return comparisonData;
    } catch (error: any) {
      console.error(
        'Error in AnalyticsService.getDivisionBatchComparisons:',
        error
      );
      throw error;
    }
  }

  /**
   * Compares average ratings between different lecture types (e.g., LECTURE, LAB) for a given semester.
   * Filters out soft-deleted records.
   * @param semesterId - The ID of the semester.
   * @returns An array of comparison data by lecture type.
   * @throws AppError if no comparison data is available.
   */
  public async getLabLectureComparison(
    semesterId: string
  ): Promise<LabLectureComparisonOutput[]> {
    try {
      const forms = await prisma.feedbackForm.findMany({
        where: {
          isDeleted: false, // Filter out soft-deleted forms
          subjectAllocation: {
            isDeleted: false, // Ensure subject allocation is not soft-deleted
            semesterId,
            semester: { isDeleted: false }, // Ensure semester is not soft-deleted
          },
        },
        include: {
          subjectAllocation: { select: { lectureType: true } },
          questions: {
            where: { isDeleted: false }, // Filter out soft-deleted questions
            include: {
              responses: {
                where: { isDeleted: false }, // Filter out soft-deleted responses
                select: {
                  value: true,
                },
              },
            },
          },
        },
      });

      if (!forms.length) {
        throw new AppError(
          'No comparison data available for the given semester.',
          404
        );
      }

      const lectureTypeGroups = this.groupBy(
        forms,
        (f) => f.subjectAllocation.lectureType
      );

      const comparison: LabLectureComparisonOutput[] = Object.entries(
        lectureTypeGroups
      ).map(([lectureType, formsInGroup]) => {
        const allResponses = formsInGroup.flatMap((f) =>
          f.questions.flatMap((q) => q.responses)
        );
        const numericResponses = allResponses
          .map((r) => parseFloat(String(r.value))) // Parse value to number
          .filter((value) => !isNaN(value)); // Filter out NaN values

        const avgRating =
          numericResponses.length > 0
            ? numericResponses.reduce((sum, r) => sum + r, 0) /
              numericResponses.length
            : 0;

        return {
          lectureType: lectureType as LectureType, // Cast back to LectureType enum
          averageRating: Number(avgRating.toFixed(2)),
          responseCount: allResponses.length,
          formCount: formsInGroup.length,
        };
      });

      return comparison;
    } catch (error: any) {
      console.error(
        'Error in AnalyticsService.getLabLectureComparison:',
        error
      );
      throw error;
    }
  }

  /**
   * Retrieves performance data for a single faculty member across semesters for a given academic year.
   * Filters out soft-deleted records.
   * @param academicYearId - The ID of the academic year.
   * @param facultyId - The ID of the faculty member.
   * @returns Formatted faculty performance data.
   * @throws AppError if no feedback data is found for the faculty and academic year.
   */
  public async getFacultyPerformanceYearData(
    academicYearId: string,
    facultyId: string
  ): Promise<FacultyPerformanceYearDataOutput> {
    try {
      const feedbackSnapshots = await prisma.feedbackSnapshot.findMany({
        where: {
          facultyId: facultyId,
          academicYearId: academicYearId,
          questionType: 'rating',
          formDeleted: false, // Assuming this means the parent form is not soft-deleted
          isDeleted: false, // Ensure the snapshot itself is not soft-deleted
        },
        select: {
          id: true,
          semesterNumber: true,
          responseValue: true,
          facultyName: true,
          academicYearString: true,
        },
        orderBy: {
          semesterNumber: 'asc',
        },
      });

      // If no feedback snapshots are found, return a default structure
      if (feedbackSnapshots.length === 0) {
        // Attempt to get faculty name and academic year string even if no snapshots
        // Fetching directly from Faculty and AcademicYear models to ensure they are active
        const faculty = await prisma.faculty.findUnique({
          where: { id: facultyId, isDeleted: false },
          select: { name: true },
        });
        const academicYear = await prisma.academicYear.findUnique({
          where: { id: academicYearId, isDeleted: false },
          select: { yearString: true },
        });

        const defaultFacultyName = faculty?.name || 'Unknown Faculty';
        const defaultAcademicYear =
          academicYear?.yearString || 'Unknown Academic Year';

        const result: FacultyPerformanceYearDataOutput = {
          Faculty_name: defaultFacultyName,
          academic_year: defaultAcademicYear,
          total_average: null, // Initialize total_average here
        };
        for (let i = 1; i <= 8; i++) {
          result[`semester ${i}`] = null;
        }
        return result;
      }

      const facultyName = feedbackSnapshots[0].facultyName;
      const academicYear = feedbackSnapshots[0].academicYearString;

      const semesterScores: { [key: number]: { sum: number; count: number } } =
        {};
      let totalSum = 0;
      let totalCount = 0;
      const maxSemesterNumber = 8;

      for (const snapshot of feedbackSnapshots) {
        const semester = snapshot.semesterNumber;
        const score = this.parseResponseValueToScore(snapshot.responseValue); // Use the helper

        if (typeof score === 'number' && !isNaN(score)) {
          if (!semesterScores[semester]) {
            semesterScores[semester] = { sum: 0, count: 0 };
          }
          semesterScores[semester].sum += score;
          semesterScores[semester].count += 1;

          totalSum += score;
          totalCount += 1;
        } else {
          console.warn(
            `Skipping snapshot ID: ${snapshot.id} due to non-numerical or unparsable score. Raw value:`,
            snapshot.responseValue
          );
        }
      }

      const result: FacultyPerformanceYearDataOutput = {
        Faculty_name: facultyName,
        academic_year: academicYear,
        total_average: null, // Initialize total_average here
      };

      for (let i = 1; i <= maxSemesterNumber; i++) {
        if (semesterScores[i] && semesterScores[i].count > 0) {
          result[`semester ${i}`] = parseFloat(
            (semesterScores[i].sum / semesterScores[i].count).toFixed(2)
          );
        } else {
          result[`semester ${i}`] = null;
        }
      }

      result.total_average =
        totalCount > 0 ? parseFloat((totalSum / totalCount).toFixed(2)) : null;

      return result;
    } catch (error: any) {
      console.error(
        'Error in AnalyticsService.getFacultyPerformanceYearData:',
        error
      );
      throw error;
    }
  }

  /**
   * Retrieves performance data for all faculty members for a given academic year.
   * Filters out soft-deleted records.
   * @param academicYearId - The ID of the academic year.
   * @returns Formatted performance data for all faculties.
   * @throws AppError if an unexpected error occurs.
   */
  public async getAllFacultyPerformanceData(
    academicYearId: string
  ): Promise<AllFacultyPerformanceDataOutput> {
    try {
      const feedbackSnapshots = await prisma.feedbackSnapshot.findMany({
        where: {
          academicYearId: academicYearId,
          questionType: 'rating',
          formDeleted: false, // Assuming this means the parent form is not soft-deleted
          isDeleted: false, // Ensure the snapshot itself is not soft-deleted
        },
        select: {
          id: true,
          facultyId: true,
          facultyName: true,
          semesterNumber: true,
          responseValue: true,
          academicYearString: true,
        },
        orderBy: [
          { facultyId: 'asc' }, // Order by faculty for easier grouping
          { semesterNumber: 'asc' },
        ],
      });

      // Handle case where no feedback is found for the academic year
      if (feedbackSnapshots.length === 0) {
        // Attempt to get academic year string even if no snapshots
        const academicYearRecord = await prisma.academicYear.findUnique({
          where: { id: academicYearId, isDeleted: false },
          select: { yearString: true },
        });
        const defaultAcademicYear =
          academicYearRecord?.yearString || 'Unknown Academic Year';

        return {
          academic_year: defaultAcademicYear,
          faculties: [], // Return an empty array of faculties
        };
      }

      interface FacultyAggregatedData {
        facultyId: string;
        Faculty_name: string;
        academic_year: string;
        semesters: { [key: number]: { sum: number; count: number } };
        totalSum: number;
        totalCount: number;
      }

      const aggregatedData: { [facultyId: string]: FacultyAggregatedData } = {};
      const maxSemesterNumber = 8; // Define the maximum possible semester number

      for (const snapshot of feedbackSnapshots) {
        const facultyId = snapshot.facultyId;
        const semester = snapshot.semesterNumber;
        const score = this.parseResponseValueToScore(snapshot.responseValue); // Use the helper

        // Initialize faculty data if not already present
        if (!aggregatedData[facultyId]) {
          aggregatedData[facultyId] = {
            facultyId: facultyId,
            Faculty_name: snapshot.facultyName,
            academic_year: snapshot.academicYearString,
            semesters: {},
            totalSum: 0,
            totalCount: 0,
          };
        }

        if (typeof score === 'number' && !isNaN(score)) {
          if (!aggregatedData[facultyId].semesters[semester]) {
            aggregatedData[facultyId].semesters[semester] = {
              sum: 0,
              count: 0,
            };
          }
          aggregatedData[facultyId].semesters[semester].sum += score;
          aggregatedData[facultyId].semesters[semester].count += 1;

          aggregatedData[facultyId].totalSum += score;
          aggregatedData[facultyId].totalCount += 1;
        } else {
          console.warn(
            `Skipping score for snapshot ${snapshot.id} due to invalid value:`,
            snapshot.responseValue
          );
        }
      }

      // Calculate Averages and Format Final Result
      const finalResultFaculties: Array<
        FacultyPerformanceYearDataOutput & { facultyId: string }
      > = [];

      for (const facultyId in aggregatedData) {
        const facultyData = aggregatedData[facultyId];
        const facultyOutput: FacultyPerformanceYearDataOutput & {
          facultyId: string;
        } = {
          facultyId: facultyData.facultyId, // Include facultyId for identification
          Faculty_name: facultyData.Faculty_name,
          academic_year: facultyData.academic_year,
          total_average: null, // Initialize total_average here
        };

        for (let i = 1; i <= maxSemesterNumber; i++) {
          if (facultyData.semesters[i] && facultyData.semesters[i].count > 0) {
            facultyOutput[`semester ${i}`] = parseFloat(
              (
                facultyData.semesters[i].sum / facultyData.semesters[i].count
              ).toFixed(2)
            );
          } else {
            facultyOutput[`semester ${i}`] = null;
          }
        }

        facultyOutput.total_average =
          facultyData.totalCount > 0
            ? parseFloat(
                (facultyData.totalSum / facultyData.totalCount).toFixed(2)
              )
            : null;

        finalResultFaculties.push(facultyOutput);
      }

      return {
        academic_year: feedbackSnapshots[0].academicYearString, // Use the academic year from the first snapshot
        faculties: finalResultFaculties,
      };
    } catch (error: any) {
      console.error(
        'Error in AnalyticsService.getAllFacultyPerformanceData:',
        error
      );
      throw error;
    }
  }

  /**
   * @description Retrieves the total number of student responses.
   * Filters out soft-deleted responses.
   * @returns The total count of active student responses.
   */
  public async getTotalResponses(): Promise<number> {
    try {
      const totalResponses = await prisma.studentResponse.count({
        where: {
          isDeleted: false, // Only count active responses
        },
      });
      return totalResponses;
    } catch (error: any) {
      console.error('Error in AnalyticsService.getTotalResponses:', error);
      throw new AppError('Failed to retrieve total responses count.', 500);
    }
  }

  /**
   * @description Retrieves semesters and their divisions, including response counts for each division.
   * Filters out soft-deleted records at all levels.
   * @returns An array of semesters with their divisions and response counts.
   * @throws AppError if an error occurs during data fetching.
   */
  public async getSemesterDivisionsWithResponseCounts(): Promise<
    SemesterDivisionResponseOutput[]
  > {
    try {
      const semesterDivisions = await prisma.semester.findMany({
        where: {
          isDeleted: false, // Filter soft-deleted semesters
          academicYear: { isDeleted: false }, // Ensure academic year is not soft-deleted
        },
        select: {
          id: true,
          semesterNumber: true,
          academicYear: {
            select: {
              id: true,
              yearString: true,
            },
          },
          divisions: {
            where: {
              isDeleted: false, // Filter soft-deleted divisions
            },
            select: {
              id: true,
              divisionName: true,
              studentCount: true,
              students: {
                where: {
                  isDeleted: false, // Filter soft-deleted students
                },
                select: {
                  responses: {
                    where: {
                      isDeleted: false, // Filter soft-deleted responses
                    },
                    select: {
                      id: true,
                      value: true,
                      submittedAt: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          semesterNumber: 'asc',
        },
      });

      const formattedResponse: SemesterDivisionResponseOutput[] =
        semesterDivisions
          .map((semester) => {
            const divisionsWithResponses: SemesterDivisionDetails[] =
              semester.divisions
                .map((division) => {
                  const responseCount = division.students.reduce(
                    (count, student) => count + student.responses.length,
                    0
                  );
                  return {
                    divisionId: division.id,
                    divisionName: division.divisionName,
                    studentCount: division.studentCount,
                    responseCount,
                  };
                })
                .filter((division) => division.responseCount > 0); // Only include divisions with responses

            return {
              semesterId: semester.id,
              semesterNumber: semester.semesterNumber,
              academicYear: semester.academicYear,
              divisions: divisionsWithResponses,
            };
          })
          .filter((semester) => semester.divisions.length > 0); // Only include semesters that have divisions with responses

      return formattedResponse;
    } catch (error: any) {
      console.error(
        'Error in AnalyticsService.getSemesterDivisionsWithResponseCounts:',
        error
      );
      throw new AppError('Error fetching semester divisions data.', 500);
    }
  }
}

export const analyticsService = new AnalyticsService();
