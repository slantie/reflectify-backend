/**
 * @file src/services/visualAnalytics/visualAnalytics.service.ts
 * @description Service layer for generating data specifically for visual analytics (charts).
 * Encapsulates business logic and interacts with the Prisma client.
 */

import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError';

// --- Output Interfaces for Visual Analytics ---

interface SubjectAnalyticsOutput {
  subjectName: string;
  overallAverage: number;
  facultyAverage: number;
}

interface GroupedBarChartOutput {
  facultyName: string;
  subjects: SubjectAnalyticsOutput[];
}

interface LineChartPerformanceData {
  semester: number;
  lectureAverage: number;
  labAverage: number;
}

interface LineChartOutput {
  facultyId: string;
  performanceData: LineChartPerformanceData[];
}

interface UniqueFacultyOutput {
  id: string;
  name: string;
  abbreviation: string | null;
}

interface UniqueSubjectOutput {
  id: string;
  name: string;
  abbreviation: string | null;
  subjectCode: string | null;
}

interface RadarChartDataset {
  label: string;
  data: number[];
}

interface RadarChartOutput {
  labels: string[];
  datasets: RadarChartDataset[];
}

interface SubjectPerformanceDataOutput {
  facultyId: string;
  facultyName: string;
  facultyAbbr: string | null;
  divisionId: string;
  divisionName: string;
  type: 'LECTURE' | 'LAB';
  batch: string;
  averageScore: number;
  responseCount: number;
}

interface SubjectPerformanceResultOutput {
  lectures: SubjectPerformanceDataOutput[];
  labs: SubjectPerformanceDataOutput[];
}

// --- Helper Functions ---

/**
 * Helper function to parse raw response value into a numeric score.
 * Handles cases where the value might be a string number, a JSON string with a 'score' field,
 * or a direct number/object with a 'score' field.
 * @param rawResponseValue - The raw value from the database (JSON field).
 * @returns The numeric score, or null if parsing fails.
 * @private
 */
const parseResponseValueToScore = (rawResponseValue: any): number | null => {
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
        // Ignore parsing errors for non-JSON strings
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
};

class VisualAnalyticsService {
  /**
   * Generates data for a grouped bar chart comparing a faculty's average rating
   * per subject against the overall average rating for that subject.
   * Filters out soft-deleted records.
   * @param facultyId - The ID of the faculty member.
   * @returns Data for a grouped bar chart.
   * @throws AppError if faculty not found or no data.
   */
  public async getGroupedBarChartData(
    facultyId: string
  ): Promise<GroupedBarChartOutput> {
    try {
      const faculty = await prisma.faculty.findUnique({
        where: { id: facultyId, isDeleted: false },
        select: { name: true },
      });

      if (!faculty) {
        throw new AppError('Faculty not found or is deleted.', 404);
      }

      // Find all unique subjects where this faculty has received feedback
      const subjectsWithResponses = await prisma.feedbackQuestion.findMany({
        where: {
          facultyId: facultyId,
          isDeleted: false, // Filter soft-deleted questions
          responses: {
            some: { isDeleted: false }, // Ensure there are active responses
          },
          subject: { isDeleted: false }, // Ensure subject is not soft-deleted
        },
        select: {
          subject: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        distinct: ['subjectId'],
      });

      const subjectAnalytics: SubjectAnalyticsOutput[] = [];

      for (const subjectData of subjectsWithResponses) {
        const subjectId = subjectData.subject.id;

        // Get all responses for this subject (overall average)
        const overallResponses = await prisma.studentResponse.findMany({
          where: {
            isDeleted: false, // Filter soft-deleted responses
            question: {
              isDeleted: false, // Ensure question is not soft-deleted
              subjectId: subjectId,
              subject: { isDeleted: false }, // Ensure subject is not soft-deleted
            },
          },
          select: {
            value: true,
          },
        });

        // Get responses for this faculty for this specific subject
        const facultyResponses = await prisma.studentResponse.findMany({
          where: {
            isDeleted: false, // Filter soft-deleted responses
            question: {
              isDeleted: false, // Ensure question is not soft-deleted
              subjectId: subjectId,
              facultyId: facultyId,
              subject: { isDeleted: false }, // Ensure subject is not soft-deleted
              faculty: { isDeleted: false }, // Ensure faculty is not soft-deleted
            },
          },
          select: {
            value: true,
          },
        });

        const overallRatings = overallResponses
          .map((r) => parseResponseValueToScore(r.value))
          .filter((val): val is number => val !== null);

        const facultyRatings = facultyResponses
          .map((r) => parseResponseValueToScore(r.value))
          .filter((val): val is number => val !== null);

        const overallAverage =
          overallRatings.length > 0
            ? overallRatings.reduce((sum, rating) => sum + rating, 0) /
              overallRatings.length
            : 0;

        const facultyAverage =
          facultyRatings.length > 0
            ? facultyRatings.reduce((sum, rating) => sum + rating, 0) /
              facultyRatings.length
            : 0;

        subjectAnalytics.push({
          subjectName: subjectData.subject.name,
          overallAverage: Number(overallAverage.toFixed(2)),
          facultyAverage: Number(facultyAverage.toFixed(2)),
        });
      }

      const response: GroupedBarChartOutput = {
        facultyName: faculty.name,
        subjects: subjectAnalytics,
      };

      return response;
    } catch (error: any) {
      console.error(
        'Error in VisualAnalyticsService.getGroupedBarChartData:',
        error
      );
      throw error; // Re-throw AppError or wrap other errors
    }
  }

  /**
   * Retrieves faculty performance data for a line chart, showing lecture and lab averages per semester.
   * Filters out soft-deleted records.
   * @param facultyId - The ID of the faculty member.
   * @returns Data for a line chart.
   * @throws AppError if faculty not found or no data.
   */
  public async getFacultyPerformanceDataForLineChart(
    facultyId: string
  ): Promise<LineChartOutput> {
    try {
      const facultyExists = await prisma.faculty.findUnique({
        where: { id: facultyId, isDeleted: false },
        select: { id: true, name: true },
      });

      if (!facultyExists) {
        throw new AppError('Faculty not found or is deleted.', 404);
      }

      const studentResponses = await prisma.studentResponse.findMany({
        where: {
          isDeleted: false, // Filter soft-deleted responses
          question: {
            isDeleted: false, // Filter soft-deleted questions
            facultyId: facultyId,
            faculty: { isDeleted: false }, // Ensure faculty is not soft-deleted
            form: {
              isDeleted: false, // Filter soft-deleted forms
              subjectAllocation: {
                isDeleted: false, // Filter soft-deleted subject allocations
                semester: { isDeleted: false }, // Filter soft-deleted semesters
              },
            },
          },
        },
        include: {
          question: {
            select: {
              batch: true, // This is used to determine LECTURE/LAB in original code ('None' for lecture)
              form: {
                select: {
                  subjectAllocation: {
                    select: {
                      semester: { select: { semesterNumber: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!studentResponses.length) {
        return { facultyId, performanceData: [] };
      }

      const semesterData = new Map<
        number,
        {
          LECTURE: number[];
          LAB: number[];
        }
      >();

      studentResponses.forEach((response) => {
        const semesterNumber =
          response.question.form.subjectAllocation.semester.semesterNumber;
        const value = parseResponseValueToScore(response.value);
        const batch = response.question.batch; // 'None' for lecture, batch number for lab

        if (value === null) {
          console.warn(
            `Skipping response ID: ${response.id} due to non-numerical or unparsable score.`
          );
          return;
        }

        if (!semesterData.has(semesterNumber)) {
          semesterData.set(semesterNumber, {
            LECTURE: [],
            LAB: [],
          });
        }

        const ratings = semesterData.get(semesterNumber)!;

        // Assuming 'None' batch implies lecture, and other batches imply lab
        if (batch === 'None') {
          ratings.LECTURE.push(value);
        } else {
          ratings.LAB.push(value);
        }
      });

      const chartData: LineChartPerformanceData[] = Array.from(
        semesterData.entries()
      ).map(([semester, ratings]) => ({
        semester,
        lectureAverage:
          ratings.LECTURE.length > 0
            ? Number(
                (
                  ratings.LECTURE.reduce((a, b) => a + b, 0) /
                  ratings.LECTURE.length
                ).toFixed(2)
              )
            : 0,
        labAverage:
          ratings.LAB.length > 0
            ? Number(
                (
                  ratings.LAB.reduce((a, b) => a + b, 0) / ratings.LAB.length
                ).toFixed(2)
              )
            : 0,
      }));

      // Sort by semester number
      chartData.sort((a, b) => a.semester - b.semester);

      return {
        facultyId,
        performanceData: chartData,
      };
    } catch (error: any) {
      console.error(
        'Error in VisualAnalyticsService.getFacultyPerformanceDataForLineChart:',
        error
      );
      throw error;
    }
  }

  /**
   * Retrieves a list of unique faculties that have received feedback responses.
   * Filters out soft-deleted records.
   * @returns An array of unique faculty details.
   */
  public async getUniqueFacultiesWithResponses(): Promise<
    UniqueFacultyOutput[]
  > {
    try {
      const uniqueFacultyIds = await prisma.feedbackQuestion.groupBy({
        by: ['facultyId'],
        where: {
          isDeleted: false, // Filter soft-deleted questions
          responses: {
            some: { isDeleted: false }, // Ensure there are active responses
          },
          faculty: { isDeleted: false }, // Ensure faculty is not soft-deleted
        },
        _count: true, // Just to ensure grouping works, count is not used in return
      });

      const facultyDetails = await prisma.faculty.findMany({
        where: {
          id: {
            in: uniqueFacultyIds.map((f) => f.facultyId),
          },
          isDeleted: false, // Filter soft-deleted faculties
        },
        select: {
          id: true,
          name: true,
          abbreviation: true,
        },
      });

      return facultyDetails;
    } catch (error: any) {
      console.error(
        'Error in VisualAnalyticsService.getUniqueFacultiesWithResponses:',
        error
      );
      throw new AppError('Error fetching unique faculty list.', 500);
    }
  }

  /**
   * Retrieves a list of unique subjects that have received feedback responses.
   * Filters out soft-deleted records.
   * @returns An array of unique subject details.
   */
  public async getUniqueSubjectsWithResponses(): Promise<
    UniqueSubjectOutput[]
  > {
    try {
      const uniqueSubjectIds = await prisma.feedbackQuestion.groupBy({
        by: ['subjectId'],
        where: {
          isDeleted: false, // Filter soft-deleted questions
          responses: {
            some: { isDeleted: false }, // Ensure there are active responses
          },
          subject: { isDeleted: false }, // Ensure subject is not soft-deleted
        },
        _count: true,
      });

      const subjectDetails = await prisma.subject.findMany({
        where: {
          id: {
            in: uniqueSubjectIds.map((s) => s.subjectId),
          },
          isDeleted: false, // Filter soft-deleted subjects
        },
        select: {
          id: true,
          name: true,
          abbreviation: true,
          subjectCode: true,
        },
      });

      return subjectDetails;
    } catch (error: any) {
      console.error(
        'Error in VisualAnalyticsService.getUniqueSubjectsWithResponses:',
        error
      );
      throw new AppError('Error fetching unique subject list.', 500);
    }
  }

  /**
   * Retrieves data for a radar chart showing lecture and lab ratings per subject for a specific faculty.
   * Filters out soft-deleted records.
   * @param facultyId - The ID of the faculty member.
   * @returns Data for a radar chart.
   * @throws AppError if faculty not found or no data.
   */
  public async getFacultyRadarData(
    facultyId: string
  ): Promise<RadarChartOutput> {
    try {
      const facultyExists = await prisma.faculty.findUnique({
        where: { id: facultyId, isDeleted: false },
        select: { id: true, name: true },
      });

      if (!facultyExists) {
        throw new AppError('Faculty not found or is deleted.', 404);
      }

      const studentResponses = await prisma.studentResponse.findMany({
        where: {
          isDeleted: false, // Filter soft-deleted responses
          question: {
            isDeleted: false, // Filter soft-deleted questions
            facultyId: facultyId,
            faculty: { isDeleted: false }, // Ensure faculty is not soft-deleted
            subject: { isDeleted: false }, // Ensure subject is not soft-deleted
          },
        },
        include: {
          question: {
            select: {
              subject: { select: { name: true } },
              batch: true, // Used to distinguish lecture/lab
            },
          },
        },
      });

      if (!studentResponses.length) {
        return { labels: [], datasets: [] };
      }

      const subjectRatings = new Map<
        string,
        {
          LECTURE: number[];
          LAB: number[];
        }
      >();

      studentResponses.forEach((response) => {
        const subjectName = response.question.subject.name;
        const value = parseResponseValueToScore(response.value);
        const batch = response.question.batch;

        if (value === null) {
          console.warn(
            `Skipping response ID: ${response.id} due to non-numerical or unparsable score.`
          );
          return;
        }

        if (!subjectRatings.has(subjectName)) {
          subjectRatings.set(subjectName, {
            LECTURE: [],
            LAB: [],
          });
        }

        const ratings = subjectRatings.get(subjectName)!;

        // Assuming 'None' batch implies lecture, and other batches imply lab
        if (batch === 'None') {
          ratings.LECTURE.push(value);
        } else {
          ratings.LAB.push(value);
        }
      });

      const subjects = Array.from(subjectRatings.keys()).sort(); // Sort subjects alphabetically
      const lectureRatings: number[] = [];
      const labRatings: number[] = [];

      subjects.forEach((subject) => {
        const ratings = subjectRatings.get(subject)!;

        const lectureAvg =
          ratings.LECTURE.length > 0
            ? Number(
                (
                  ratings.LECTURE.reduce((a, b) => a + b, 0) /
                  ratings.LECTURE.length
                ).toFixed(2)
              )
            : 0;

        const labAvg =
          ratings.LAB.length > 0
            ? Number(
                (
                  ratings.LAB.reduce((a, b) => a + b, 0) / ratings.LAB.length
                ).toFixed(2)
              )
            : 0;

        lectureRatings.push(lectureAvg);
        labRatings.push(labAvg);
      });

      const radarData: RadarChartOutput = {
        labels: subjects,
        datasets: [
          {
            label: 'Lecture Ratings',
            data: lectureRatings,
          },
          {
            label: 'Lab Ratings',
            data: labRatings,
          },
        ],
      };

      return radarData;
    } catch (error: any) {
      console.error(
        'Error in VisualAnalyticsService.getFacultyRadarData:',
        error
      );
      throw error;
    }
  }

  /**
   * Retrieves subject performance data, grouped by faculty, division, and batch (Lecture/Lab).
   * Filters out soft-deleted records.
   * @param subjectId - The ID of the subject.
   * @returns Formatted subject performance data.
   * @throws AppError if no responses found for the subject.
   */
  public async getSubjectPerformanceData(
    subjectId: string
  ): Promise<SubjectPerformanceResultOutput> {
    try {
      const responses = await prisma.studentResponse.findMany({
        where: {
          isDeleted: false, // Filter soft-deleted responses
          question: {
            isDeleted: false, // Filter soft-deleted questions
            subjectId: subjectId,
            subject: { isDeleted: false }, // Ensure subject is not soft-deleted
            faculty: { isDeleted: false }, // Ensure faculty is not soft-deleted
            form: {
              isDeleted: false, // Filter soft-deleted forms
              division: { isDeleted: false }, // Ensure division is not soft-deleted
            },
          },
        },
        include: {
          question: {
            select: {
              faculty: {
                select: {
                  id: true,
                  name: true,
                  abbreviation: true,
                },
              },
              batch: true, // 'None' for lecture, batch number for lab
              form: {
                select: {
                  division: {
                    select: {
                      divisionName: true,
                      id: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!responses.length) {
        throw new AppError('No responses found for the given subject.', 404);
      }

      // Group responses by faculty, division and batch (for lab/lecture)
      const performanceMap = new Map<
        string,
        {
          facultyId: string;
          facultyName: string;
          facultyAbbr: string | null;
          divisionId: string;
          divisionName: string;
          batch: string;
          ratings: number[];
        }
      >();

      responses.forEach((response) => {
        const faculty = response.question.faculty;
        const division = response.question.form.division;
        const batch = response.question.batch; // 'None' for lecture, batch number for lab

        // Create unique key for faculty-division-batch combination
        const key = `${faculty.id}-${division.id}-${batch}`;

        const value = parseResponseValueToScore(response.value);

        if (value === null) {
          console.warn(
            `Skipping response ID: ${response.id} due to non-numerical or unparsable score.`
          );
          return;
        }

        if (!performanceMap.has(key)) {
          performanceMap.set(key, {
            facultyId: faculty.id,
            facultyName: faculty.name,
            facultyAbbr: faculty.abbreviation,
            divisionId: division.id,
            divisionName: division.divisionName,
            batch: batch,
            ratings: [],
          });
        }

        performanceMap.get(key)?.ratings.push(value);
      });

      // Calculate averages and format response
      const performanceData: SubjectPerformanceDataOutput[] = Array.from(
        performanceMap.values()
      ).map((data) => ({
        facultyId: data.facultyId,
        facultyName: data.facultyName,
        facultyAbbr: data.facultyAbbr,
        divisionId: data.divisionId,
        divisionName: data.divisionName,
        type: data.batch === 'None' ? 'LECTURE' : 'LAB',
        batch: data.batch === 'None' ? '-' : data.batch,
        averageScore: Number(
          (
            data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length
          ).toFixed(2)
        ),
        responseCount: data.ratings.length,
      }));

      // Separate lecture and lab data
      const result: SubjectPerformanceResultOutput = {
        lectures: performanceData.filter((d) => d.type === 'LECTURE'),
        labs: performanceData.filter((d) => d.type === 'LAB'),
      };

      return result;
    } catch (error: any) {
      console.error(
        'Error in VisualAnalyticsService.getSubjectPerformanceData:',
        error
      );
      throw error;
    }
  }
}

export const visualAnalyticsService = new VisualAnalyticsService();
