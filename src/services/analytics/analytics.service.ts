/**
 * @file src/services/analytics/analytics.service.ts
 * @description Service layer for feedback analytics operations.
 * Encapsulates business logic and interacts with the Prisma client.
 */

import { Prisma, LectureType } from '@prisma/client';
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
  departmentId: string;
  academicYear: {
    id: string;
    yearString: string;
  };
  department: {
    id: string;
    name: string;
    abbreviation: string;
  };
  responseCount: number;
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

// NEW: Filter Dictionary Output types
interface FilterDictionaryOutput {
  academicYears: Array<{
    id: string;
    yearString: string;
    departments: Array<{
      id: string;
      name: string;
      abbreviation: string;
      subjects: Array<{
        id: string;
        name: string;
        code: string;
        type: string;
      }>;
      semesters: Array<{
        id: string;
        semesterNumber: number;
        divisions: Array<{
          id: string;
          divisionName: string;
        }>;
      }>;
    }>;
  }>;
  lectureTypes: Array<{
    value: LectureType;
    label: string;
  }>;
}

// NEW: Complete Analytics Data Output
interface CompleteAnalyticsDataOutput {
  semesters: Array<{
    id: string;
    semesterNumber: number;
    departmentId: string;
    academicYearId: string;
    startDate: string | null;
    endDate: string | null;
    semesterType: string;
    department: {
      id: string;
      name: string;
      abbreviation: string;
    };
    academicYear: {
      id: string;
      yearString: string;
    };
    responseCount: number;
  }>;
  subjectRatings: Array<{
    subjectId: string;
    subjectName: string;
    subjectAbbreviation: string;
    lectureType: LectureType;
    averageRating: number;
    responseCount: number;
    semesterNumber: number;
    academicYearId: string;
    facultyId: string;
    facultyName: string;
  }>;
  semesterTrends: Array<{
    subject: string;
    semester: number;
    averageRating: number;
    responseCount: number;
    academicYearId: string;
    academicYear: string;
  }>;
  feedbackSnapshots: Array<{
    id: string;
    // Academic Year
    academicYearId: string;
    academicYearString: string;
    // Department
    departmentId: string;
    departmentName: string;
    departmentAbbreviation: string;
    // Semester
    semesterId: string;
    semesterNumber: number;
    // Division
    divisionId: string;
    divisionName: string;
    // Subject
    subjectId: string;
    subjectName: string;
    subjectAbbreviation: string;
    subjectCode: string;
    // Faculty
    facultyId: string;
    facultyName: string;
    facultyAbbreviation: string;
    // Student
    studentId: string | null;
    studentEnrollmentNumber: string;
    // Form
    formId: string;
    formStatus: string;
    // Question
    questionId: string;
    questionType: string;
    questionCategoryId: string;
    questionCategoryName: string;
    questionBatch: string;
    // Response
    responseValue: any;
    batch: string;
    submittedAt: string;
    createdAt: string;
  }>;
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
        feedbackForm: {
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
          responseValue: true,
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
        .map((r) => parseFloat(String(r.responseValue))) // Convert to string first, then parse
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
  public async getSemestersWithResponses(
    academicYearId?: string,
    departmentId?: string
  ): Promise<SemesterWithResponsesOutput[]> {
    try {
      const whereClause: any = {
        isDeleted: false, // Filter out soft-deleted semesters
        academicYear: { isDeleted: false }, // Ensure academic year is not soft-deleted
        department: { isDeleted: false }, // Ensure department is not soft-deleted
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
      };

      // Apply optional filters
      if (academicYearId) {
        whereClause.academicYearId = academicYearId;
      }

      if (departmentId) {
        whereClause.departmentId = departmentId;
      }

      const semestersWithResponses = await prisma.semester.findMany({
        where: whereClause,
        select: {
          id: true,
          semesterNumber: true,
          departmentId: true,
          academicYear: {
            select: {
              id: true,
              yearString: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
            },
          },
          allocations: {
            where: {
              isDeleted: false,
            },
            select: {
              feedbackForms: {
                where: {
                  isDeleted: false,
                },
                select: {
                  responses: {
                    where: {
                      isDeleted: false,
                    },
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          semesterNumber: 'desc',
        },
      });

      // Calculate response counts for each semester
      const result: SemesterWithResponsesOutput[] = semestersWithResponses.map(
        (semester) => {
          const responseCount = semester.allocations.reduce(
            (total, allocation) => {
              return (
                total +
                allocation.feedbackForms.reduce((formTotal, form) => {
                  return formTotal + form.responses.length;
                }, 0)
              );
            },
            0
          );

          return {
            id: semester.id,
            semesterNumber: semester.semesterNumber,
            departmentId: semester.departmentId,
            academicYear: semester.academicYear,
            department: semester.department,
            responseCount,
          };
        }
      );

      return result;
    } catch (error: any) {
      console.error(
        'Error in AnalyticsService.getSemestersWithResponses:',
        error
      );
      throw new AppError('Failed to retrieve semesters with responses.', 500);
    }
  }

  /**
   * Gets subject-wise ratings split by lecture and lab types for a specific semester.
   * Uses feedbackSnapshot for improved performance and correct data aggregation.
   * @param semesterId - The ID of the semester (used to filter by semesterNumber).
   * @param academicYearId - Optional academic year ID for additional filtering.
   * @returns An array of subject ratings grouped by lecture/lab type.
   * @throws AppError if no feedback data is found.
   */
  public async getSubjectWiseLectureLabRating(
    semesterId: string,
    academicYearId?: string
  ): Promise<SubjectWiseRatingOutput[]> {
    try {
      // First, get the semester number from the semester ID
      const semester = await prisma.semester.findUnique({
        where: { id: semesterId, isDeleted: false },
        select: { semesterNumber: true, academicYearId: true },
      });

      if (!semester) {
        throw new AppError('Semester not found.', 404);
      }

      const whereClause: Prisma.FeedbackSnapshotWhereInput = {
        isDeleted: false,
        formDeleted: false,
        semesterNumber: semester.semesterNumber,
        ...(academicYearId && { academicYearId }),
        // If no academic year is specified, use the semester's academic year
        ...(!academicYearId && { academicYearId: semester.academicYearId }),
      };

      const snapshots = await prisma.feedbackSnapshot.findMany({
        where: whereClause,
        select: {
          subjectName: true,
          questionCategoryName: true,
          batch: true,
          responseValue: true,
        },
      });

      if (!snapshots.length) {
        throw new AppError(
          'No feedback data found for the given semester.',
          404
        );
      }

      // Group by subject and lecture type
      const groupedData = this.groupBy(snapshots, (snapshot) => {
        // Determine lecture type based on batch or questionCategoryName
        let lectureType: LectureType;
        if (
          snapshot.questionCategoryName?.toLowerCase().includes('laboratory') ||
          snapshot.questionCategoryName?.toLowerCase().includes('lab')
        ) {
          lectureType = LectureType.LAB;
        } else if (snapshot.batch && snapshot.batch.toLowerCase() !== 'none') {
          lectureType = LectureType.LAB;
        } else {
          lectureType = LectureType.LECTURE;
        }

        return `${snapshot.subjectName}|${lectureType}`;
      });

      const subjectRatings: SubjectWiseRatingOutput[] = Object.entries(
        groupedData
      ).map(([key, snapshots]) => {
        const [subjectName, lectureType] = key.split('|');

        // Parse numeric responses
        const numericResponses = snapshots
          .map((snapshot) =>
            this.parseResponseValueToScore(snapshot.responseValue)
          )
          .filter((score): score is number => score !== null);

        const avgRating =
          numericResponses.length > 0
            ? numericResponses.reduce((acc, score) => acc + score, 0) /
              numericResponses.length
            : 0;

        return {
          subject: subjectName,
          lectureType: lectureType as LectureType,
          averageRating: Number(avgRating.toFixed(2)),
          responseCount: snapshots.length,
        };
      });

      return subjectRatings.sort((a, b) => a.subject.localeCompare(b.subject));
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
        },
        include: {
          responses: {
            where: {
              isDeleted: false, // Filter out soft-deleted responses
            },
            select: { responseValue: true }, // Only need the value for calculation
          },
          category: true, // Include the entire category object
          faculty: true, // Include the entire faculty object
          subject: true, // Include the entire subject object
        },
      });

      const significantLowRatedQuestions: HighImpactFeedbackAreaOutput[] = [];

      for (const question of questionsWithResponses) {
        const numericResponses = question.responses
          .map((r) => parseFloat(String(r.responseValue)))
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
   * Analyzes performance trends across semesters for subjects.
   * Uses feedbackSnapshot for improved performance and correct data aggregation.
   * @param subjectId - Optional subject ID to filter trends for a specific subject.
   * @param academicYearId - Optional academic year ID to limit trends to a specific year.
   * @returns An array of trend data grouped by semester and subject.
   * @throws AppError if no trend data is available.
   */
  public async getSemesterTrendAnalysis(
    subjectId?: string,
    academicYearId?: string
  ): Promise<SemesterTrendAnalysisOutput[]> {
    try {
      const whereClause: Prisma.FeedbackSnapshotWhereInput = {
        isDeleted: false,
        formDeleted: false,
        ...(subjectId && { subjectId }),
        ...(academicYearId && { academicYearId }),
      };

      const snapshots = await prisma.feedbackSnapshot.findMany({
        where: whereClause,
        select: {
          semesterNumber: true,
          subjectName: true,
          responseValue: true,
          academicYearString: true,
        },
        orderBy: [
          { academicYearString: 'asc' },
          { semesterNumber: 'asc' },
          { subjectName: 'asc' },
        ],
      });

      if (!snapshots.length) {
        throw new AppError(
          'No trend data available for the given criteria.',
          404
        );
      }

      // Group by semester and subject
      const groupedData = this.groupBy(
        snapshots,
        (snapshot) => `${snapshot.semesterNumber}|${snapshot.subjectName}`
      );

      const trends: SemesterTrendAnalysisOutput[] = Object.entries(
        groupedData
      ).map(([key, snapshots]) => {
        const [semesterNumber, subjectName] = key.split('|');

        // Parse numeric responses
        const numericResponses = snapshots
          .map((snapshot) =>
            this.parseResponseValueToScore(snapshot.responseValue)
          )
          .filter((score): score is number => score !== null);

        const avgRating =
          numericResponses.length > 0
            ? numericResponses.reduce((acc, score) => acc + score, 0) /
              numericResponses.length
            : 0;

        return {
          semester: parseInt(semesterNumber),
          subject: subjectName,
          averageRating: Number(avgRating.toFixed(2)),
          responseCount: snapshots.length,
        };
      });

      // Sort by semester then by subject for consistent ordering
      return trends.sort((a, b) => {
        if (a.semester !== b.semester) {
          return a.semester - b.semester;
        }
        return a.subject.localeCompare(b.subject);
      });
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
                  responseValue: true,
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

      // Process each form directly using the snapshots approach instead of relationships
      for (const form of forms) {
        // Get division info
        const division = await prisma.division.findUnique({
          where: { id: form.divisionId },
          select: { divisionName: true },
        });

        if (!division) continue;

        // Get responses for this form
        const responses = await prisma.studentResponse.findMany({
          where: {
            feedbackFormId: form.id,
            isDeleted: false,
          },
          select: {
            responseValue: true,
            student: {
              select: {
                batch: true,
                isDeleted: true,
              },
            },
          },
        });

        // Filter out responses from soft-deleted students
        const activeResponses = responses.filter(
          (r) => r.student && !r.student.isDeleted
        );

        // Group by batch
        const batchGroups: Record<string, typeof activeResponses> = {};
        for (const response of activeResponses) {
          const batch = response.student?.batch || 'Unknown';
          if (!batchGroups[batch]) {
            batchGroups[batch] = [];
          }
          batchGroups[batch].push(response);
        }

        // Process each batch group
        Object.entries(batchGroups).forEach(([batch, batchResponses]) => {
          const numericBatchResponses = batchResponses
            .map((r) => parseFloat(String(r.responseValue)))
            .filter((value) => !isNaN(value));

          const avgRating =
            numericBatchResponses.length > 0
              ? numericBatchResponses.reduce((sum, r) => sum + r, 0) /
                numericBatchResponses.length
              : 0;

          comparisonData.push({
            division: division.divisionName,
            batch,
            averageRating: Number(avgRating.toFixed(2)),
            responseCount: batchResponses.length,
          });
        });
      }

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
      // Get forms and their allocation info separately
      const forms = await prisma.feedbackForm.findMany({
        where: {
          isDeleted: false, // Filter out soft-deleted forms
          subjectAllocation: {
            isDeleted: false, // Ensure subject allocation is not soft-deleted
            semesterId,
            semester: { isDeleted: false }, // Ensure semester is not soft-deleted
          },
        },
        select: {
          id: true,
          subjectAllocationId: true,
        },
      });

      // For each form, get the allocation and responses separately
      const formsWithData = await Promise.all(
        forms.map(async (form) => {
          // Get the subject allocation with lecture type
          const allocation = await prisma.subjectAllocation.findUnique({
            where: { id: form.subjectAllocationId },
            select: { lectureType: true },
          });

          // Get responses for this form
          const responses = await prisma.studentResponse.findMany({
            where: {
              feedbackFormId: form.id,
              isDeleted: false,
            },
            select: { responseValue: true },
          });

          return {
            ...form,
            lectureType: allocation?.lectureType || 'LECTURE',
            responses: responses,
          };
        })
      );

      if (!forms.length) {
        throw new AppError(
          'No comparison data available for the given semester.',
          404
        );
      }

      // Group forms by lecture type
      const lectureTypeData: Record<
        string,
        { responses: any[]; forms: any[] }
      > = {};

      for (const form of forms) {
        // Get allocation to determine lecture type
        const allocation = await prisma.subjectAllocation.findUnique({
          where: { id: form.subjectAllocationId },
          select: { lectureType: true },
        });

        const lectureType = allocation?.lectureType || 'LECTURE';

        if (!lectureTypeData[lectureType]) {
          lectureTypeData[lectureType] = { responses: [], forms: [] };
        }

        // Add form to the group
        lectureTypeData[lectureType].forms.push(form);

        // Get responses for this form
        const responses = await prisma.studentResponse.findMany({
          where: {
            feedbackFormId: form.id,
            isDeleted: false,
          },
          select: { responseValue: true },
        });

        // Add all responses to the group
        lectureTypeData[lectureType].responses.push(...responses);
      }

      // Process each lecture type group
      const comparison: LabLectureComparisonOutput[] = Object.entries(
        lectureTypeData
      ).map(([lectureType, data]) => {
        const numericResponses = data.responses
          .map((r) => parseFloat(String(r.responseValue)))
          .filter((value) => !isNaN(value));

        const avgRating =
          numericResponses.length > 0
            ? numericResponses.reduce((sum, r) => sum + r, 0) /
              numericResponses.length
            : 0;

        return {
          lectureType: lectureType as LectureType, // Cast back to LectureType enum
          averageRating: Number(avgRating.toFixed(2)),
          responseCount: data.responses.length,
          formCount: data.forms.length,
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
      // Get all non-deleted semesters
      const semesters = await prisma.semester.findMany({
        where: {
          isDeleted: false, // Filter soft-deleted semesters
          academicYear: { isDeleted: false }, // Ensure academic year is not soft-deleted
        },
        select: {
          id: true,
          semesterNumber: true,
          academicYearId: true,
        },
        orderBy: {
          semesterNumber: 'asc',
        },
      });

      const formattedResponse: SemesterDivisionResponseOutput[] = [];

      // Process each semester individually
      for (const semester of semesters) {
        // Get academic year info
        const academicYear = await prisma.academicYear.findUnique({
          where: { id: semester.academicYearId },
          select: {
            id: true,
            yearString: true,
          },
        });

        if (!academicYear) continue;

        // Get divisions for this semester
        const divisions = await prisma.division.findMany({
          where: {
            isDeleted: false,
            semesterId: semester.id,
          },
          select: {
            id: true,
            divisionName: true,
            studentCount: true,
          },
        });

        const divisionsWithResponses: SemesterDivisionDetails[] = [];

        // For each division, get response counts
        for (const division of divisions) {
          // Count responses for this division
          const responseCount = await prisma.studentResponse.count({
            where: {
              isDeleted: false,
              feedbackForm: {
                isDeleted: false,
                division: {
                  id: division.id,
                  isDeleted: false,
                },
              },
            },
          });

          if (responseCount > 0) {
            divisionsWithResponses.push({
              divisionId: division.id,
              divisionName: division.divisionName,
              studentCount: division.studentCount,
              responseCount,
            });
          }
        }

        // Only include if there are divisions with responses
        if (divisionsWithResponses.length > 0) {
          formattedResponse.push({
            semesterId: semester.id,
            semesterNumber: semester.semesterNumber,
            academicYear: academicYear,
            divisions: divisionsWithResponses,
          });
        }
      }

      return formattedResponse;
    } catch (error: any) {
      console.error(
        'Error in AnalyticsService.getSemesterDivisionsWithResponseCounts:',
        error
      );
      throw new AppError('Error fetching semester divisions data.', 500);
    }
  }

  /**
   * Gets the filter dictionary with Academic Years -> Departments -> Subjects hierarchy
   * @returns Hierarchical filter options for frontend dropdowns
   */
  public async getFilterDictionary(): Promise<FilterDictionaryOutput> {
    try {
      const academicYears = await prisma.academicYear.findMany({
        where: {
          isDeleted: false,
        },
        select: {
          id: true,
          yearString: true,
        },
        orderBy: {
          yearString: 'desc',
        },
      });

      const filterData: FilterDictionaryOutput = {
        academicYears: [],
        lectureTypes: [
          { value: LectureType.LECTURE, label: 'Lecture' },
          { value: LectureType.LAB, label: 'Laboratory' },
        ],
      };

      for (const year of academicYears) {
        const departments = await prisma.department.findMany({
          where: {
            isDeleted: false,
            semesters: {
              some: {
                academicYearId: year.id,
                isDeleted: false,
              },
            },
          },
          select: {
            id: true,
            name: true,
            abbreviation: true,
          },
          orderBy: {
            name: 'asc',
          },
        });

        const departmentsWithSubjectsAndSemesters = [];

        for (const dept of departments) {
          const subjects = await prisma.subject.findMany({
            where: {
              isDeleted: false,
              semester: {
                academicYearId: year.id,
                departmentId: dept.id,
                isDeleted: false,
              },
            },
            select: {
              id: true,
              name: true,
              subjectCode: true,
              type: true,
            },
            orderBy: {
              subjectCode: 'asc',
            },
          });

          const semesters = await prisma.semester.findMany({
            where: {
              academicYearId: year.id,
              departmentId: dept.id,
              isDeleted: false,
            },
            select: {
              id: true,
              semesterNumber: true,
              divisions: {
                where: {
                  isDeleted: false,
                },
                select: {
                  id: true,
                  divisionName: true,
                },
                orderBy: {
                  divisionName: 'asc',
                },
              },
            },
            orderBy: {
              semesterNumber: 'asc',
            },
          });

          departmentsWithSubjectsAndSemesters.push({
            ...dept,
            subjects: subjects.map((subject) => ({
              id: subject.id,
              name: subject.name,
              code: subject.subjectCode,
              type: subject.type.toString(),
            })),
            semesters: semesters.map((semester) => ({
              id: semester.id,
              semesterNumber: semester.semesterNumber,
              divisions: semester.divisions,
            })),
          });
        }

        filterData.academicYears.push({
          ...year,
          departments: departmentsWithSubjectsAndSemesters,
        });
      }

      return filterData;
    } catch (error: any) {
      console.error('Error in AnalyticsService.getFilterDictionary:', error);
      throw new AppError('Failed to retrieve filter dictionary.', 500);
    }
  }

  /**
   * Gets complete analytics data based on filters
   * @param academicYearId - Optional academic year filter
   * @param departmentId - Optional department filter
   * @param subjectId - Optional subject filter
   * @param semesterId - Optional semester filter
   * @param divisionId - Optional division filter
   * @param lectureType - Optional lecture type filter (LECTURE or LAB)
   * @param includeDeleted - Whether to include soft-deleted records
   * @returns Complete analytics data including semesters, subject ratings, and feedback snapshots
   */
  public async getCompleteAnalyticsData(
    academicYearId?: string,
    departmentId?: string,
    subjectId?: string,
    semesterId?: string,
    divisionId?: string,
    lectureType?: LectureType,
    includeDeleted = false
  ): Promise<CompleteAnalyticsDataOutput> {
    try {
      // Build where clause for semesters
      const semesterWhereClause: Prisma.SemesterWhereInput = {
        isDeleted: includeDeleted ? undefined : false,
      };

      // If not including deleted, ensure the related department is also not deleted
      if (!includeDeleted) {
        semesterWhereClause.department = {
          isDeleted: false,
        };
      }

      if (academicYearId) {
        semesterWhereClause.academicYearId = academicYearId;
      }

      if (departmentId) {
        semesterWhereClause.departmentId = departmentId;
      }

      if (semesterId) {
        semesterWhereClause.id = semesterId;
      }

      // Get filtered semesters with response counts
      const semesters = await prisma.semester.findMany({
        where: semesterWhereClause,
        include: {
          academicYear: true,
          department: true,
          allocations: {
            where: {
              isDeleted: false,
            },
            select: {
              feedbackForms: {
                where: {
                  isDeleted: false,
                },
                select: {
                  responses: {
                    where: {
                      isDeleted: false,
                    },
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [
          { academicYear: { yearString: 'desc' } },
          { semesterNumber: 'asc' },
        ],
      });

      // Format semesters data with calculated response counts
      const formattedSemesters = semesters.map((semester) => {
        const responseCount = semester.allocations.reduce(
          (total, allocation) => {
            return (
              total +
              allocation.feedbackForms.reduce((formTotal, form) => {
                return formTotal + form.responses.length;
              }, 0)
            );
          },
          0
        );

        return {
          id: semester.id,
          semesterNumber: semester.semesterNumber,
          departmentId: semester.departmentId,
          academicYearId: semester.academicYearId,
          startDate: semester.startDate?.toISOString() || null,
          endDate: semester.endDate?.toISOString() || null,
          semesterType: semester.semesterType.toString(),
          department: semester.department || {
            id: semester.departmentId,
            name: 'Unknown Department',
            abbreviation: 'UNK',
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          academicYear: semester.academicYear,
          responseCount,
        };
      });

      // Build where clause for feedback snapshots
      const snapshotWhereClause: Prisma.FeedbackSnapshotWhereInput = {
        isDeleted: includeDeleted ? undefined : false,
        formIsDeleted: includeDeleted ? undefined : false, // Updated field name
      };

      if (academicYearId) {
        snapshotWhereClause.academicYearId = academicYearId;
      }

      if (departmentId) {
        snapshotWhereClause.departmentId = departmentId; // Now we have direct departmentId field
      }

      if (subjectId) {
        snapshotWhereClause.subjectId = subjectId;
      }

      if (semesterId) {
        snapshotWhereClause.semesterId = semesterId;
      }

      if (divisionId) {
        snapshotWhereClause.divisionId = divisionId;
      }

      if (semesterId) {
        snapshotWhereClause.semesterId = semesterId;
      }

      if (divisionId) {
        snapshotWhereClause.divisionId = divisionId;
      }

      // Note: lectureType filtering is done after retrieving data since it's derived from questionCategoryName/batch

      // Get feedback snapshots with complete data using new field names
      let feedbackSnapshots = await prisma.feedbackSnapshot.findMany({
        where: snapshotWhereClause,
        select: {
          id: true,
          // Academic Year
          academicYearId: true,
          academicYearString: true,
          // Department
          departmentId: true,
          departmentName: true,
          departmentAbbreviation: true,
          // Semester
          semesterId: true,
          semesterNumber: true,
          // Division
          divisionId: true,
          divisionName: true,
          // Subject
          subjectId: true,
          subjectName: true,
          subjectAbbreviation: true,
          subjectCode: true,
          // Faculty
          facultyId: true,
          facultyName: true,
          facultyAbbreviation: true,
          // Student
          studentId: true,
          studentEnrollmentNumber: true,
          // Form
          formId: true,
          formStatus: true,
          // Question
          questionId: true,
          questionType: true,
          questionCategoryId: true,
          questionCategoryName: true,
          questionBatch: true,
          // Response
          responseValue: true,
          batch: true,
          submittedAt: true,
          createdAt: true,
        },
        orderBy: [{ semesterNumber: 'asc' }, { subjectName: 'asc' }],
      });

      // Filter by lecture type if specified
      if (lectureType) {
        feedbackSnapshots = feedbackSnapshots.filter((snapshot) => {
          // Determine lecture type based on batch or questionCategoryName
          let snapshotLectureType: LectureType;
          if (
            snapshot.questionCategoryName
              ?.toLowerCase()
              .includes('laboratory') ||
            snapshot.questionCategoryName?.toLowerCase().includes('lab')
          ) {
            snapshotLectureType = LectureType.LAB;
          } else if (
            snapshot.questionBatch &&
            snapshot.questionBatch.toLowerCase() !== 'none'
          ) {
            snapshotLectureType = LectureType.LAB;
          } else {
            snapshotLectureType = LectureType.LECTURE;
          }

          return snapshotLectureType === lectureType;
        });
      }

      // Group snapshots by subject and lecture type for aggregation
      const groupedSnapshots = this.groupBy(feedbackSnapshots, (snapshot) => {
        // Determine lecture type based on batch or questionCategoryName
        let lectureType: LectureType;
        if (
          snapshot.questionCategoryName?.toLowerCase().includes('laboratory') ||
          snapshot.questionCategoryName?.toLowerCase().includes('lab')
        ) {
          lectureType = LectureType.LAB;
        } else {
          lectureType = LectureType.LECTURE;
        }

        return `${snapshot.subjectName}|${lectureType}|${snapshot.semesterNumber}`;
      });

      // Calculate subject ratings from grouped snapshots
      const subjectRatings = Object.entries(groupedSnapshots).map(
        ([key, snapshots]) => {
          const [subjectName, lectureType, semesterNumberStr] = key.split('|');
          const semesterNumber = parseInt(semesterNumberStr);

          // Parse numeric responses
          const numericResponses = snapshots
            .map((snapshot) =>
              this.parseResponseValueToScore(snapshot.responseValue)
            )
            .filter((score): score is number => score !== null);

          const avgRating =
            numericResponses.length > 0
              ? numericResponses.reduce((acc, score) => acc + score, 0) /
                numericResponses.length
              : 0;

          // Get additional info from first snapshot in group
          const firstSnapshot = snapshots[0];

          return {
            subjectId: firstSnapshot.subjectId,
            subjectName: subjectName,
            subjectAbbreviation: firstSnapshot.subjectAbbreviation,
            lectureType: lectureType as LectureType,
            averageRating: Number(avgRating.toFixed(2)),
            responseCount: snapshots.length,
            semesterNumber: semesterNumber,
            academicYearId: firstSnapshot.academicYearId,
            facultyId: firstSnapshot.facultyId,
            facultyName: firstSnapshot.facultyName,
          };
        }
      );

      // Group snapshots for semester trends (by subject and semester)
      const semesterTrendsGrouped = this.groupBy(
        feedbackSnapshots,
        (snapshot) => `${snapshot.subjectName}|${snapshot.semesterNumber}`
      );

      const semesterTrends = Object.entries(semesterTrendsGrouped).map(
        ([key, snapshots]) => {
          const [subjectName, semesterNumberStr] = key.split('|');
          const semesterNumber = parseInt(semesterNumberStr);

          // Parse numeric responses
          const numericResponses = snapshots
            .map((snapshot) =>
              this.parseResponseValueToScore(snapshot.responseValue)
            )
            .filter((score): score is number => score !== null);

          const avgRating =
            numericResponses.length > 0
              ? numericResponses.reduce((acc, score) => acc + score, 0) /
                numericResponses.length
              : 0;

          const firstSnapshot = snapshots[0];

          return {
            subject: subjectName,
            semester: semesterNumber,
            averageRating: Number(avgRating.toFixed(2)),
            responseCount: snapshots.length,
            academicYearId: firstSnapshot.academicYearId,
            academicYear: firstSnapshot.academicYearString,
          };
        }
      );

      return {
        semesters: formattedSemesters,
        subjectRatings,
        semesterTrends,
        feedbackSnapshots: feedbackSnapshots.map((snapshot) => ({
          id: snapshot.id,
          // Academic Year
          academicYearId: snapshot.academicYearId,
          academicYearString: snapshot.academicYearString,
          // Department
          departmentId: snapshot.departmentId,
          departmentName: snapshot.departmentName,
          departmentAbbreviation: snapshot.departmentAbbreviation,
          // Semester
          semesterId: snapshot.semesterId,
          semesterNumber: snapshot.semesterNumber,
          // Division
          divisionId: snapshot.divisionId,
          divisionName: snapshot.divisionName,
          // Subject
          subjectId: snapshot.subjectId,
          subjectName: snapshot.subjectName,
          subjectAbbreviation: snapshot.subjectAbbreviation,
          subjectCode: snapshot.subjectCode,
          // Faculty
          facultyId: snapshot.facultyId,
          facultyName: snapshot.facultyName,
          facultyAbbreviation: snapshot.facultyAbbreviation,
          // Student
          studentId: snapshot.studentId || null,
          studentEnrollmentNumber: snapshot.studentEnrollmentNumber,
          // Form
          formId: snapshot.formId,
          formStatus: snapshot.formStatus,
          // Question
          questionId: snapshot.questionId,
          questionType: snapshot.questionType,
          questionCategoryId: snapshot.questionCategoryId,
          questionCategoryName: snapshot.questionCategoryName,
          questionBatch: snapshot.questionBatch,
          // Response
          responseValue: snapshot.responseValue,
          batch: snapshot.batch,
          submittedAt: snapshot.submittedAt.toISOString(),
          createdAt: snapshot.createdAt.toISOString(),
        })),
      };
    } catch (error: any) {
      console.error(
        'Error in AnalyticsService.getCompleteAnalyticsData:',
        error
      );
      throw new AppError('Failed to retrieve complete analytics data.', 500);
    }
  }
}

export const analyticsService = new AnalyticsService();
