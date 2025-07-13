/**
 * @file src/services/analytics/analytics.service.ts
 * @description Service layer for feedback analytics operations.
 * Encapsulates business logic and interacts with the Prisma client.
 */

import { Prisma, LectureType } from '@prisma/client';
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';

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
  lowRatingCount: number;
  averageRating: number;
}

interface SemesterTrendAnalysisOutput {
  semester: number;
  subject: string;
  averageRating: number;
  responseCount: number;
  academicYearId?: string;
  academicYear?: string;
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

interface FacultyPerformanceYearDataOutput {
  Faculty_name: string;
  academic_year: string;
  total_average: number | null;
  total_responses?: number; // Add total responses field
  [key: string]: string | number | null | undefined;
}

interface AllFacultyPerformanceDataOutput {
  academic_year: string;
  faculties: Array<FacultyPerformanceYearDataOutput & { facultyId: string }>;
}

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
    academicYearId: string;
    academicYearString: string;
    departmentId: string;
    departmentName: string;
    departmentAbbreviation: string;
    semesterId: string;
    semesterNumber: number;
    divisionId: string;
    divisionName: string;
    subjectId: string;
    subjectName: string;
    subjectAbbreviation: string;
    subjectCode: string;
    facultyId: string;
    facultyName: string;
    facultyAbbreviation: string;
    studentId: string | null;
    studentEnrollmentNumber: string;
    formId: string;
    formStatus: string;
    questionId: string;
    questionType: string;
    questionCategoryId: string;
    questionCategoryName: string;
    questionBatch: string;
    responseValue: any;
    batch: string;
    submittedAt: string;
    createdAt: string;
  }>;
}

class AnalyticsService {
  // Helper function to group an array of objects by a specified key.
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

  // Helper function to parse raw response value into a numeric score.
  private parseResponseValueToScore(rawResponseValue: any): number | null {
    let score: number | null = null;

    if (typeof rawResponseValue === 'string') {
      const parsedFloat = parseFloat(rawResponseValue);
      if (!isNaN(parsedFloat)) {
        score = parsedFloat;
      } else {
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
    } else if (
      typeof rawResponseValue === 'object' &&
      rawResponseValue !== null &&
      'score' in rawResponseValue &&
      typeof (rawResponseValue as any).score === 'number'
    ) {
      score = (rawResponseValue as any).score;
    } else if (typeof rawResponseValue === 'number') {
      score = rawResponseValue;
    }

    return typeof score === 'number' && !isNaN(score) ? score : null;
  }

  // Calculates the overall average rating for a specific semester.
  public async getOverallSemesterRating(
    semesterId: string,
    divisionId?: string,
    batch?: string
  ): Promise<OverallSemesterRatingOutput> {
    try {
      const whereClause: Prisma.StudentResponseWhereInput = {
        isDeleted: false,
        feedbackForm: {
          isDeleted: false,
          subjectAllocation: {
            isDeleted: false,
            semesterId,
            semester: { isDeleted: false },
          },
          division: {
            isDeleted: false,
            ...(divisionId && { id: divisionId }),
          },
        },
        student: {
          isDeleted: false,
          ...(batch && { batch }),
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

      const numericResponses = responses
        .map((r) => parseFloat(String(r.responseValue)))
        .filter((value) => !isNaN(value));

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
      throw error;
    }
  }

  // Retrieves a list of semesters that have associated feedback responses.
  public async getSemestersWithResponses(
    academicYearId?: string,
    departmentId?: string
  ): Promise<SemesterWithResponsesOutput[]> {
    try {
      const whereClause: any = {
        isDeleted: false,
        academicYear: { isDeleted: false },
        department: { isDeleted: false },
        allocations: {
          some: {
            isDeleted: false,
            feedbackForms: {
              some: {
                isDeleted: false,
                responses: {
                  some: {
                    isDeleted: false,
                  },
                },
              },
            },
          },
        },
      };

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

  // Gets subject-wise ratings split by lecture and lab types for a specific semester.
  public async getSubjectWiseLectureLabRating(
    semesterId: string,
    academicYearId?: string
  ): Promise<SubjectWiseRatingOutput[]> {
    try {
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

      const groupedData = this.groupBy(snapshots, (snapshot) => {
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

  // Identifies high-impact feedback areas (questions with significant low ratings) for a given semester.
  public async getHighImpactFeedbackAreas(
    semesterId: string
  ): Promise<HighImpactFeedbackAreaOutput[]> {
    try {
      const LOW_RATING_THRESHOLD = 3;
      const SIGNIFICANT_COUNT = 5;

      const questionsWithResponses = await prisma.feedbackQuestion.findMany({
        where: {
          isDeleted: false,
          form: {
            isDeleted: false,
            subjectAllocation: {
              isDeleted: false,
              semesterId,
              semester: { isDeleted: false },
            },
          },
        },
        include: {
          responses: {
            where: {
              isDeleted: false,
            },
            select: { responseValue: true },
          },
          category: true,
          faculty: true,
          subject: true,
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
            lowRatingCount: lowRatedResponses.length,
            averageRating: Number(averageRating.toFixed(2)),
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

  // Analyzes performance trends across semesters for subjects.
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

      const groupedData = this.groupBy(
        snapshots,
        (snapshot) => `${snapshot.semesterNumber}|${snapshot.subjectName}`
      );

      const trends: SemesterTrendAnalysisOutput[] = Object.entries(
        groupedData
      ).map(([key, snapshots]) => {
        const [semesterNumber, subjectName] = key.split('|');

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

  // Retrieves annual performance trends based on aggregated feedback analytics.
  public async getAnnualPerformanceTrend(): Promise<
    AnnualPerformanceTrendOutput[]
  > {
    try {
      const annualTrends = await prisma.feedbackAnalytics.groupBy({
        by: ['calculatedAt'],
        where: { isDeleted: false },
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
      console.error('Full error details:', JSON.stringify(error, null, 2));

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new AppError(
          `Database error during annual trend analysis: ${error.message} (Code: ${error.code})`,
          500
        );
      }
      throw new AppError('Error analyzing annual performance trends.', 500);
    }
  }

  // Compares average ratings across different divisions and batches for a given semester.
  public async getDivisionBatchComparisons(
    semesterId: string
  ): Promise<DivisionBatchComparisonOutput[]> {
    try {
      const forms = await prisma.feedbackForm.findMany({
        where: {
          isDeleted: false,
          subjectAllocation: {
            isDeleted: false,
            semesterId,
            semester: { isDeleted: false },
          },
          division: { isDeleted: false },
        },
        include: {
          division: { select: { divisionName: true } },
          questions: {
            where: { isDeleted: false },
            include: {
              responses: {
                where: { isDeleted: false },
                select: {
                  responseValue: true,
                  student: { select: { batch: true, isDeleted: true } },
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

      for (const form of forms) {
        const division = await prisma.division.findUnique({
          where: { id: form.divisionId },
          select: { divisionName: true },
        });

        if (!division) continue;

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

        const activeResponses = responses.filter(
          (r) => r.student && !r.student.isDeleted
        );

        const batchGroups: Record<string, typeof activeResponses> = {};
        for (const response of activeResponses) {
          const batch = response.student?.batch || 'Unknown';
          if (!batchGroups[batch]) {
            batchGroups[batch] = [];
          }
          batchGroups[batch].push(response);
        }

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

  // Compares average ratings between different lecture types (e.g., LECTURE, LAB) for a given semester.
  public async getLabLectureComparison(
    semesterId: string
  ): Promise<LabLectureComparisonOutput[]> {
    try {
      const forms = await prisma.feedbackForm.findMany({
        where: {
          isDeleted: false,
          subjectAllocation: {
            isDeleted: false,
            semesterId,
            semester: { isDeleted: false },
          },
        },
        select: {
          id: true,
          subjectAllocationId: true,
        },
      });

      if (!forms.length) {
        throw new AppError(
          'No comparison data available for the given semester.',
          404
        );
      }

      const lectureTypeData: Record<
        string,
        { responses: any[]; forms: any[] }
      > = {};

      for (const form of forms) {
        const allocation = await prisma.subjectAllocation.findUnique({
          where: { id: form.subjectAllocationId },
          select: { lectureType: true },
        });

        const lectureType = allocation?.lectureType || 'LECTURE';

        if (!lectureTypeData[lectureType]) {
          lectureTypeData[lectureType] = { responses: [], forms: [] };
        }

        lectureTypeData[lectureType].forms.push(form);

        const responses = await prisma.studentResponse.findMany({
          where: {
            feedbackFormId: form.id,
            isDeleted: false,
          },
          select: { responseValue: true },
        });

        lectureTypeData[lectureType].responses.push(...responses);
      }

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
          lectureType: lectureType as LectureType,
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

  // Retrieves performance data for a single faculty member across semesters for a given academic year.
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
          formDeleted: false,
          isDeleted: false,
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

      if (feedbackSnapshots.length === 0) {
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
          total_average: null,
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
        const score = this.parseResponseValueToScore(snapshot.responseValue);

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
        total_average: null,
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

  // Retrieves performance data for all faculty members for a given academic year.
  public async getAllFacultyPerformanceData(
    academicYearId: string
  ): Promise<AllFacultyPerformanceDataOutput> {
    try {
      const feedbackSnapshots = await prisma.feedbackSnapshot.findMany({
        where: {
          academicYearId: academicYearId,
          questionType: 'rating',
          formDeleted: false,
          isDeleted: false,
        },
        select: {
          id: true,
          facultyId: true,
          facultyName: true,
          semesterNumber: true,
          responseValue: true,
          academicYearString: true,
        },
        orderBy: [{ facultyId: 'asc' }, { semesterNumber: 'asc' }],
      });

      if (feedbackSnapshots.length === 0) {
        const academicYearRecord = await prisma.academicYear.findUnique({
          where: { id: academicYearId, isDeleted: false },
          select: { yearString: true },
        });
        const defaultAcademicYear =
          academicYearRecord?.yearString || 'Unknown Academic Year';

        return {
          academic_year: defaultAcademicYear,
          faculties: [],
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
      const maxSemesterNumber = 8;

      for (const snapshot of feedbackSnapshots) {
        const facultyId = snapshot.facultyId;
        const semester = snapshot.semesterNumber;
        const score = this.parseResponseValueToScore(snapshot.responseValue);

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

      const finalResultFaculties: Array<
        FacultyPerformanceYearDataOutput & { facultyId: string }
      > = [];

      for (const facultyId in aggregatedData) {
        const facultyData = aggregatedData[facultyId];
        const facultyOutput: FacultyPerformanceYearDataOutput & {
          facultyId: string;
        } = {
          facultyId: facultyData.facultyId,
          Faculty_name: facultyData.Faculty_name,
          academic_year: facultyData.academic_year,
          total_average: null,
          total_responses: facultyData.totalCount, // Add total responses count
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
        academic_year: feedbackSnapshots[0].academicYearString,
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

  // Retrieves the total number of student responses.
  public async getTotalResponses(): Promise<number> {
    try {
      const totalResponses = await prisma.studentResponse.count({
        where: {
          isDeleted: false,
        },
      });
      return totalResponses;
    } catch (error: any) {
      console.error('Error in AnalyticsService.getTotalResponses:', error);
      throw new AppError('Failed to retrieve total responses count.', 500);
    }
  }

  // Retrieves semesters and their divisions, including response counts for each division.
  public async getSemesterDivisionsWithResponseCounts(): Promise<
    SemesterDivisionResponseOutput[]
  > {
    try {
      const semesters = await prisma.semester.findMany({
        where: {
          isDeleted: false,
          academicYear: { isDeleted: false },
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

      for (const semester of semesters) {
        const academicYear = await prisma.academicYear.findUnique({
          where: { id: semester.academicYearId },
          select: {
            id: true,
            yearString: true,
          },
        });

        if (!academicYear) continue;

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

        for (const division of divisions) {
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

  // Gets the filter dictionary with Academic Years -> Departments -> Subjects hierarchy.
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

  // Gets complete analytics data based on filters.
  // public async getCompleteAnalyticsData(
  //   academicYearId?: string,
  //   departmentId?: string,
  //   subjectId?: string,
  //   semesterId?: string,
  //   divisionId?: string,
  //   lectureType?: LectureType,
  //   includeDeleted = false
  // ): Promise<CompleteAnalyticsDataOutput> {
  //   try {
  //     const semesterWhereClause: Prisma.SemesterWhereInput = {
  //       isDeleted: includeDeleted ? undefined : false,
  //     };

  //     if (!includeDeleted) {
  //       semesterWhereClause.department = {
  //         isDeleted: false,
  //       };
  //     }

  //     if (academicYearId) {
  //       semesterWhereClause.academicYearId = academicYearId;
  //     }

  //     if (departmentId) {
  //       semesterWhereClause.departmentId = departmentId;
  //     }

  //     if (semesterId) {
  //       semesterWhereClause.id = semesterId;
  //     }

  //     const semesters = await prisma.semester.findMany({
  //       where: semesterWhereClause,
  //       include: {
  //         academicYear: true,
  //         department: true,
  //         allocations: {
  //           where: {
  //             isDeleted: false,
  //           },
  //           select: {
  //             feedbackForms: {
  //               where: {
  //                 isDeleted: false,
  //               },
  //               select: {
  //                 responses: {
  //                   where: {
  //                     isDeleted: false,
  //                   },
  //                   select: {
  //                     id: true,
  //                   },
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       },
  //       orderBy: [
  //         { academicYear: { yearString: 'desc' } },
  //         { semesterNumber: 'asc' },
  //       ],
  //     });

  //     const formattedSemesters = semesters.map((semester) => {
  //       const responseCount = semester.allocations.reduce(
  //         (total, allocation) => {
  //           return (
  //             total +
  //             allocation.feedbackForms.reduce((formTotal, form) => {
  //               return formTotal + form.responses.length;
  //             }, 0)
  //           );
  //         },
  //         0
  //       );

  //       return {
  //         id: semester.id,
  //         semesterNumber: semester.semesterNumber,
  //         departmentId: semester.departmentId,
  //         academicYearId: semester.academicYearId,
  //         startDate: semester.startDate?.toISOString() || null,
  //         endDate: semester.endDate?.toISOString() || null,
  //         semesterType: semester.semesterType.toString(),
  //         department: semester.department || {
  //           id: semester.departmentId,
  //           name: 'Unknown Department',
  //           abbreviation: 'UNK',
  //           isDeleted: false,
  //           createdAt: new Date(),
  //           updatedAt: new Date(),
  //         },
  //         academicYear: semester.academicYear,
  //         responseCount,
  //       };
  //     });

  //     const snapshotWhereClause: Prisma.FeedbackSnapshotWhereInput = {
  //       isDeleted: includeDeleted ? undefined : false,
  //       formIsDeleted: includeDeleted ? undefined : false,
  //     };

  //     if (academicYearId) {
  //       snapshotWhereClause.academicYearId = academicYearId;
  //     }

  //     if (departmentId) {
  //       snapshotWhereClause.departmentId = departmentId;
  //     }

  //     if (subjectId) {
  //       snapshotWhereClause.subjectId = subjectId;
  //     }

  //     if (semesterId) {
  //       snapshotWhereClause.semesterId = semesterId;
  //     }

  //     if (divisionId) {
  //       snapshotWhereClause.divisionId = divisionId;
  //     }

  //     if (semesterId) {
  //       snapshotWhereClause.semesterId = semesterId;
  //     }

  //     if (divisionId) {
  //       snapshotWhereClause.divisionId = divisionId;
  //     }

  //     let feedbackSnapshots = await prisma.feedbackSnapshot.findMany({
  //       where: snapshotWhereClause,
  //       select: {
  //         id: true,
  //         academicYearId: true,
  //         academicYearString: true,
  //         departmentId: true,
  //         departmentName: true,
  //         departmentAbbreviation: true,
  //         semesterId: true,
  //         semesterNumber: true,
  //         divisionId: true,
  //         divisionName: true,
  //         subjectId: true,
  //         subjectName: true,
  //         subjectAbbreviation: true,
  //         subjectCode: true,
  //         facultyId: true,
  //         facultyName: true,
  //         facultyAbbreviation: true,
  //         studentId: true,
  //         studentEnrollmentNumber: true,
  //         formId: true,
  //         formStatus: true,
  //         questionId: true,
  //         questionType: true,
  //         questionCategoryId: true,
  //         questionCategoryName: true,
  //         questionBatch: true,
  //         responseValue: true,
  //         batch: true,
  //         submittedAt: true,
  //         createdAt: true,
  //       },
  //       orderBy: [{ semesterNumber: 'asc' }, { subjectName: 'asc' }],
  //     });

  //     if (lectureType) {
  //       feedbackSnapshots = feedbackSnapshots.filter((snapshot) => {
  //         let snapshotLectureType: LectureType;
  //         if (
  //           snapshot.questionCategoryName
  //             ?.toLowerCase()
  //             .includes('laboratory') ||
  //           snapshot.questionCategoryName?.toLowerCase().includes('lab')
  //         ) {
  //           snapshotLectureType = LectureType.LAB;
  //         } else if (
  //           snapshot.questionBatch &&
  //           snapshot.questionBatch.toLowerCase() !== 'none'
  //         ) {
  //           snapshotLectureType = LectureType.LAB;
  //         } else {
  //           snapshotLectureType = LectureType.LECTURE;
  //         }

  //         return snapshotLectureType === lectureType;
  //       });
  //     }

  //     const groupedSnapshots = this.groupBy(feedbackSnapshots, (snapshot) => {
  //       let lectureType: LectureType;
  //       if (
  //         snapshot.questionCategoryName?.toLowerCase().includes('laboratory') ||
  //         snapshot.questionCategoryName?.toLowerCase().includes('lab')
  //       ) {
  //         lectureType = LectureType.LAB;
  //       } else {
  //         lectureType = LectureType.LECTURE;
  //       }

  //       return `${snapshot.subjectName}|${lectureType}|${snapshot.semesterNumber}`;
  //     });

  //     const subjectRatings = Object.entries(groupedSnapshots).map(
  //       ([key, snapshots]) => {
  //         const [subjectName, lectureType, semesterNumberStr] = key.split('|');
  //         const semesterNumber = parseInt(semesterNumberStr);

  //         const numericResponses = snapshots
  //           .map((snapshot) =>
  //             this.parseResponseValueToScore(snapshot.responseValue)
  //           )
  //           .filter((score): score is number => score !== null);

  //         const avgRating =
  //           numericResponses.length > 0
  //             ? numericResponses.reduce((acc, score) => acc + score, 0) /
  //               numericResponses.length
  //             : 0;

  //         const firstSnapshot = snapshots[0];

  //         return {
  //           subjectId: firstSnapshot.subjectId,
  //           subjectName: subjectName,
  //           subjectAbbreviation: firstSnapshot.subjectAbbreviation,
  //           lectureType: lectureType as LectureType,
  //           averageRating: Number(avgRating.toFixed(2)),
  //           responseCount: snapshots.length,
  //           semesterNumber: semesterNumber,
  //           academicYearId: firstSnapshot.academicYearId,
  //           facultyId: firstSnapshot.facultyId,
  //           facultyName: firstSnapshot.facultyName,
  //         };
  //       }
  //     );

  //     const semesterTrendsGrouped = this.groupBy(
  //       feedbackSnapshots,
  //       (snapshot) => `${snapshot.subjectName}|${snapshot.semesterNumber}`
  //     );

  //     const semesterTrends = Object.entries(semesterTrendsGrouped).map(
  //       ([key, snapshots]) => {
  //         const [subjectName, semesterNumberStr] = key.split('|');
  //         const semesterNumber = parseInt(semesterNumberStr);

  //         const numericResponses = snapshots
  //           .map((snapshot) =>
  //             this.parseResponseValueToScore(snapshot.responseValue)
  //           )
  //           .filter((score): score is number => score !== null);

  //         const avgRating =
  //           numericResponses.length > 0
  //             ? numericResponses.reduce((acc, score) => acc + score, 0) /
  //               numericResponses.length
  //             : 0;

  //         const firstSnapshot = snapshots[0];

  //         return {
  //           subject: subjectName,
  //           semester: semesterNumber,
  //           averageRating: Number(avgRating.toFixed(2)),
  //           responseCount: snapshots.length,
  //           academicYearId: firstSnapshot.academicYearId,
  //           academicYear: firstSnapshot.academicYearString,
  //         };
  //       }
  //     );

  //     return {
  //       semesters: formattedSemesters,
  //       subjectRatings,
  //       semesterTrends,
  //       feedbackSnapshots: feedbackSnapshots.map((snapshot) => ({
  //         id: snapshot.id,
  //         academicYearId: snapshot.academicYearId,
  //         academicYearString: snapshot.academicYearString,
  //         departmentId: snapshot.departmentId,
  //         departmentName: snapshot.departmentName,
  //         departmentAbbreviation: snapshot.departmentAbbreviation,
  //         semesterId: snapshot.semesterId,
  //         semesterNumber: snapshot.semesterNumber,
  //         divisionId: snapshot.divisionId,
  //         divisionName: snapshot.divisionName,
  //         subjectId: snapshot.subjectId,
  //         subjectName: snapshot.subjectName,
  //         subjectAbbreviation: snapshot.subjectAbbreviation,
  //         subjectCode: snapshot.subjectCode,
  //         facultyId: snapshot.facultyId,
  //         facultyName: snapshot.facultyName,
  //         facultyAbbreviation: snapshot.facultyAbbreviation,
  //         studentId: snapshot.studentId || null,
  //         studentEnrollmentNumber: snapshot.studentEnrollmentNumber,
  //         formId: snapshot.formId,
  //         formStatus: snapshot.formStatus,
  //         questionId: snapshot.questionId,
  //         questionType: snapshot.questionType,
  //         questionCategoryId: snapshot.questionCategoryId,
  //         questionCategoryName: snapshot.questionCategoryName,
  //         questionBatch: snapshot.questionBatch,
  //         responseValue: snapshot.responseValue,
  //         batch: snapshot.batch,
  //         submittedAt: snapshot.submittedAt.toISOString(),
  //         createdAt: snapshot.createdAt.toISOString(),
  //       })),
  //     };
  //   } catch (error: any) {
  //     console.error(
  //       'Error in AnalyticsService.getCompleteAnalyticsData:',
  //       error
  //     );
  //     throw new AppError('Failed to retrieve complete analytics data.', 500);
  //   }
  // }
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
      const semesterWhereClause: Prisma.SemesterWhereInput = {
        isDeleted: includeDeleted ? undefined : false,
      };

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

      const snapshotWhereClause: Prisma.FeedbackSnapshotWhereInput = {
        // Main snapshot deletion filter
        isDeleted: includeDeleted ? undefined : false,
      };

      // If not including deleted, filter out all entities that are marked as deleted
      if (!includeDeleted) {
        snapshotWhereClause.AND = [
          { academicYearIsDeleted: false },
          { departmentIsDeleted: false },
          { semesterIsDeleted: false },
          { divisionIsDeleted: false },
          { subjectIsDeleted: false },
          { formIsDeleted: false },
          { questionIsDeleted: false },
          { formDeleted: false }, // This seems to be a duplicate of formIsDeleted, but including both for safety
        ];
      }

      // Apply additional filters
      if (academicYearId) {
        snapshotWhereClause.academicYearId = academicYearId;
      }

      if (departmentId) {
        snapshotWhereClause.departmentId = departmentId;
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

      let feedbackSnapshots = await prisma.feedbackSnapshot.findMany({
        where: snapshotWhereClause,
        select: {
          id: true,
          academicYearId: true,
          academicYearString: true,
          departmentId: true,
          departmentName: true,
          departmentAbbreviation: true,
          semesterId: true,
          semesterNumber: true,
          divisionId: true,
          divisionName: true,
          subjectId: true,
          subjectName: true,
          subjectAbbreviation: true,
          subjectCode: true,
          facultyId: true,
          facultyName: true,
          facultyAbbreviation: true,
          studentId: true,
          studentEnrollmentNumber: true,
          formId: true,
          formStatus: true,
          questionId: true,
          questionType: true,
          questionCategoryId: true,
          questionCategoryName: true,
          questionBatch: true,
          responseValue: true,
          batch: true,
          submittedAt: true,
          createdAt: true,
        },
        orderBy: [{ semesterNumber: 'asc' }, { subjectName: 'asc' }],
      });

      if (lectureType) {
        feedbackSnapshots = feedbackSnapshots.filter((snapshot) => {
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

      const groupedSnapshots = this.groupBy(feedbackSnapshots, (snapshot) => {
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

      const subjectRatings = Object.entries(groupedSnapshots).map(
        ([key, snapshots]) => {
          const [subjectName, lectureType, semesterNumberStr] = key.split('|');
          const semesterNumber = parseInt(semesterNumberStr);

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

      const semesterTrendsGrouped = this.groupBy(
        feedbackSnapshots,
        (snapshot) => `${snapshot.subjectName}|${snapshot.semesterNumber}`
      );

      const semesterTrends = Object.entries(semesterTrendsGrouped).map(
        ([key, snapshots]) => {
          const [subjectName, semesterNumberStr] = key.split('|');
          const semesterNumber = parseInt(semesterNumberStr);

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
          academicYearId: snapshot.academicYearId,
          academicYearString: snapshot.academicYearString,
          departmentId: snapshot.departmentId,
          departmentName: snapshot.departmentName,
          departmentAbbreviation: snapshot.departmentAbbreviation,
          semesterId: snapshot.semesterId,
          semesterNumber: snapshot.semesterNumber,
          divisionId: snapshot.divisionId,
          divisionName: snapshot.divisionName,
          subjectId: snapshot.subjectId,
          subjectName: snapshot.subjectName,
          subjectAbbreviation: snapshot.subjectAbbreviation,
          subjectCode: snapshot.subjectCode,
          facultyId: snapshot.facultyId,
          facultyName: snapshot.facultyName,
          facultyAbbreviation: snapshot.facultyAbbreviation,
          studentId: snapshot.studentId || null,
          studentEnrollmentNumber: snapshot.studentEnrollmentNumber,
          formId: snapshot.formId,
          formStatus: snapshot.formStatus,
          questionId: snapshot.questionId,
          questionType: snapshot.questionType,
          questionCategoryId: snapshot.questionCategoryId,
          questionCategoryName: snapshot.questionCategoryName,
          questionBatch: snapshot.questionBatch,
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
