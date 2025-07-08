/**
 * @file src/services/student/promotion.service.ts
 * @description Service layer for student promotion operations.
 * Handles promoting students to the next semester/academic year.
 */

import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';
import { Student, Semester, Division, AcademicYear } from '@prisma/client';

interface PromotionResult {
  promoted: number;
  graduated: number;
  failed: number;
  details: {
    promoted: Array<{
      studentId: string;
      studentName: string;
      fromSemester: number;
      toSemester: number;
      fromAcademicYear: string;
      toAcademicYear: string;
    }>;
    graduated: Array<{
      studentId: string;
      studentName: string;
      finalSemester: number;
      academicYear: string;
    }>;
    failed: Array<{
      studentId: string;
      studentName: string;
      reason: string;
    }>;
  };
}

interface StudentWithRelations extends Student {
  semester: Semester & {
    academicYear: AcademicYear;
  };
  division: Division;
  department: { name: string; abbreviation: string };
}

class PromotionService {
  /**
   * Promotes all eligible students to the next semester/academic year
   * @param targetAcademicYearId - The target academic year to promote students to
   * @returns PromotionResult with counts and details of promoted/graduated/failed students
   */
  public async promoteAllStudents(
    targetAcademicYearId: string
  ): Promise<PromotionResult> {
    const result: PromotionResult = {
      promoted: 0,
      graduated: 0,
      failed: 0,
      details: {
        promoted: [],
        graduated: [],
        failed: [],
      },
    };

    try {
      // Start a transaction for data consistency
      await prisma.$transaction(async (tx) => {
        // 1. Get target academic year
        const targetAcademicYear = await tx.academicYear.findUnique({
          where: { id: targetAcademicYearId, isDeleted: false },
        });

        if (!targetAcademicYear) {
          throw new AppError('Target academic year not found.', 404);
        }

        // 2. Get all active students with their current semester info
        const students = (await tx.student.findMany({
          where: { isDeleted: false },
          include: {
            semester: {
              include: {
                academicYear: true,
              },
            },
            division: true,
            department: {
              select: {
                name: true,
                abbreviation: true,
              },
            },
          },
        })) as StudentWithRelations[];

        console.log(
          `Found ${students.length} students to process for promotion`
        );

        // 3. Group students by department and current semester
        const studentsByDeptAndSem = new Map<string, StudentWithRelations[]>();

        for (const student of students) {
          const key = `${student.departmentId}-${student.semester.semesterNumber}`;
          if (!studentsByDeptAndSem.has(key)) {
            studentsByDeptAndSem.set(key, []);
          }
          studentsByDeptAndSem.get(key)!.push(student);
        }

        // 4. Process each group
        for (const [key, groupStudents] of studentsByDeptAndSem) {
          const [departmentId, currentSemesterNum] = key.split('-');
          const currentSemNumber = parseInt(currentSemesterNum);
          const nextSemNumber = currentSemNumber + 1;

          // Check if students are in final semester (assuming 8 semesters max)
          if (currentSemNumber >= 8) {
            // Graduate these students
            for (const student of groupStudents) {
              result.graduated++;
              result.details.graduated.push({
                studentId: student.id,
                studentName: student.name,
                finalSemester: currentSemNumber,
                academicYear: student.semester.academicYear.yearString,
              });
            }
            continue;
          }

          // 5. Find or create next semester in target academic year
          let nextSemester = await tx.semester.findFirst({
            where: {
              departmentId: departmentId,
              semesterNumber: nextSemNumber,
              academicYearId: targetAcademicYearId,
              isDeleted: false,
            },
          });

          if (!nextSemester) {
            // Create the next semester if it doesn't exist
            nextSemester = await tx.semester.create({
              data: {
                departmentId: departmentId,
                semesterNumber: nextSemNumber,
                academicYearId: targetAcademicYearId,
                semesterType: nextSemNumber % 2 === 1 ? 'ODD' : 'EVEN',
                startDate: null,
                endDate: null,
              },
            });
            console.log(
              `Created new semester ${nextSemNumber} for department ${departmentId}`
            );
          }

          // 6. Find or create divisions in the next semester
          const divisionMap = new Map<string, string>(); // currentDivisionId -> nextDivisionId

          for (const student of groupStudents) {
            if (!divisionMap.has(student.divisionId)) {
              let nextDivision = await tx.division.findFirst({
                where: {
                  departmentId: departmentId,
                  semesterId: nextSemester.id,
                  divisionName: student.division.divisionName,
                  isDeleted: false,
                },
              });

              if (!nextDivision) {
                // Create the division in the next semester
                nextDivision = await tx.division.create({
                  data: {
                    departmentId: departmentId,
                    semesterId: nextSemester.id,
                    divisionName: student.division.divisionName,
                    studentCount: 0, // Will be updated later
                  },
                });
                console.log(
                  `Created new division ${student.division.divisionName} for semester ${nextSemNumber}`
                );
              }

              divisionMap.set(student.divisionId, nextDivision.id);
            }
          }

          // 7. Promote students in this group
          for (const student of groupStudents) {
            const nextDivisionId = divisionMap.get(student.divisionId);

            if (!nextDivisionId) {
              result.failed++;
              result.details.failed.push({
                studentId: student.id,
                studentName: student.name,
                reason: `Could not find or create division ${student.division.divisionName} for next semester`,
              });
              continue;
            }

            try {
              // Update student record
              await tx.student.update({
                where: { id: student.id },
                data: {
                  semesterId: nextSemester.id,
                  divisionId: nextDivisionId,
                  academicYearId: targetAcademicYearId,
                },
              });

              // Create promotion history record
              await tx.promotionHistory.create({
                data: {
                  studentId: student.id,
                  fromSemesterId: student.semesterId,
                  toSemesterId: nextSemester.id,
                },
              });

              result.promoted++;
              result.details.promoted.push({
                studentId: student.id,
                studentName: student.name,
                fromSemester: currentSemNumber,
                toSemester: nextSemNumber,
                fromAcademicYear: student.semester.academicYear.yearString,
                toAcademicYear: targetAcademicYear.yearString,
              });
            } catch (error) {
              result.failed++;
              result.details.failed.push({
                studentId: student.id,
                studentName: student.name,
                reason: `Database error during promotion: ${error}`,
              });
            }
          }
        }

        // 8. Update division student counts
        const divisionsToUpdate = await tx.division.findMany({
          where: { isDeleted: false },
          include: {
            students: {
              where: { isDeleted: false },
            },
          },
        });

        for (const division of divisionsToUpdate) {
          await tx.division.update({
            where: { id: division.id },
            data: { studentCount: division.students.length },
          });
        }
      });

      console.log(
        `Promotion completed: ${result.promoted} promoted, ${result.graduated} graduated, ${result.failed} failed`
      );
      return result;
    } catch (error: any) {
      console.error('Error in PromotionService.promoteAllStudents:', error);
      throw new AppError('Failed to promote students.', 500);
    }
  }

  /**
   * Gets a preview of what would happen if promotion was executed
   * @param targetAcademicYearId - The target academic year
   * @returns Preview of promotion results without actually promoting
   */
  public async getPromotionPreview(targetAcademicYearId: string): Promise<{
    totalStudents: number;
    willBePromoted: number;
    willGraduate: number;
    byDepartment: Array<{
      departmentName: string;
      currentSemester: number;
      studentCount: number;
      action: 'promote' | 'graduate';
    }>;
  }> {
    try {
      const targetAcademicYear = await prisma.academicYear.findUnique({
        where: { id: targetAcademicYearId, isDeleted: false },
      });

      if (!targetAcademicYear) {
        throw new AppError('Target academic year not found.', 404);
      }

      const students = await prisma.student.findMany({
        where: { isDeleted: false },
        include: {
          semester: true,
          department: {
            select: { name: true },
          },
        },
      });

      const byDepartment = new Map<string, Map<number, number>>();
      let willBePromoted = 0;
      let willGraduate = 0;

      for (const student of students) {
        const deptKey = student.department.name;
        const semNumber = student.semester.semesterNumber;

        if (!byDepartment.has(deptKey)) {
          byDepartment.set(deptKey, new Map());
        }

        const deptMap = byDepartment.get(deptKey)!;
        deptMap.set(semNumber, (deptMap.get(semNumber) || 0) + 1);

        if (semNumber >= 8) {
          willGraduate++;
        } else {
          willBePromoted++;
        }
      }

      const result = [];
      for (const [deptName, semesterMap] of byDepartment) {
        for (const [semNumber, count] of semesterMap) {
          result.push({
            departmentName: deptName,
            currentSemester: semNumber,
            studentCount: count,
            action:
              semNumber >= 8 ? ('graduate' as const) : ('promote' as const),
          });
        }
      }

      return {
        totalStudents: students.length,
        willBePromoted,
        willGraduate,
        byDepartment: result,
      };
    } catch (error: any) {
      console.error('Error in PromotionService.getPromotionPreview:', error);
      throw new AppError('Failed to get promotion preview.', 500);
    }
  }

  /**
   * Promotes all eligible students to the next semester/academic year using yearString
   * Auto-creates the academic year if it doesn't exist
   * @param yearString - The year string for the target academic year (e.g., "2025-2026")
   * @returns PromotionResult with counts and details of promoted/graduated/failed students
   */
  public async promoteAllStudentsByYear(
    yearString: string
  ): Promise<PromotionResult> {
    try {
      // Find or create the target academic year
      let targetAcademicYear = await prisma.academicYear.findFirst({
        where: {
          yearString: yearString,
          isDeleted: false,
        },
      });

      if (!targetAcademicYear) {
        // Auto-create the academic year
        targetAcademicYear = await prisma.academicYear.create({
          data: {
            yearString: yearString,
            startDate: null,
            endDate: null,
            isActive: false, // Will be manually activated by admin later
          },
        });
        console.log(`Auto-created new academic year: ${yearString}`);
      }

      // Use the existing promotion logic with the found/created academic year ID
      return await this.promoteAllStudents(targetAcademicYear.id);
    } catch (error: any) {
      console.error(
        'Error in PromotionService.promoteAllStudentsByYear:',
        error
      );
      throw new AppError('Failed to promote students by year string.', 500);
    }
  }
}

export const promotionService = new PromotionService();
