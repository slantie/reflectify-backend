/**
 * @file src/services/upload/facultyMatrix.service.ts
 * @description Service layer for handling faculty matrix upload and processing.
 * It interacts with an external Flask server for data parsing and manages
 * the creation/updating of SubjectAllocation records in the database.
 */

import FormData from 'form-data';
import fetch from 'node-fetch';
import {
  SemesterTypeEnum,
  College,
  Department,
  AcademicYear,
  Semester,
  Division,
  Subject,
  Faculty,
} from '@prisma/client';
import { prisma } from '../common/prisma.service';
import AppError from '../../utils/appError';

const FLASK_SERVER =
  process.env.NODE_ENV === 'development'
    ? process.env.FLASK_DEV_SERVER
    : process.env.FLASK_PROD_SERVER;
const COLLEGE_ID = 'LDRP-ITR';

interface FacultyAssignment {
  designated_faculty: string;
}

interface SubjectAllocationData {
  lectures?: {
    designated_faculty: string;
  };
  labs?: {
    [batch: string]: FacultyAssignment;
  };
}

interface DivisionData {
  [subjectAbbreviation: string]: SubjectAllocationData;
}

interface SemesterData {
  [divisionName: string]: DivisionData;
}

interface DepartmentData {
  [semesterNumber: string]: SemesterData;
}

interface CollegeData {
  [departmentName: string]: DepartmentData;
}

interface ProcessedData {
  [collegeName: string]: CollegeData;
}

interface FlaskResponse {
  results: ProcessedData;
  status: {
    success: boolean;
    message: string;
    errors?: string[];
  };
}

interface AllocationBatchItem {
  departmentId: string;
  facultyId: string;
  subjectId: string;
  divisionId: string;
  semesterId: string;
  lectureType: 'LECTURE' | 'LAB' | 'TUTORIAL' | 'SEMINAR' | 'PROJECT';
  batch: string;
  academicYearId: string;
  isDeleted: boolean;
}

const DEPARTMENT_MAPPING: Record<
  string,
  { name: string; abbreviation: string }
> = {
  CE: { name: 'Computer Engineering', abbreviation: 'CE' },
  IT: { name: 'Information Technology', abbreviation: 'IT' },
  EC: { name: 'Electronics & Communication Engineering', abbreviation: 'EC' },
  MECH: { name: 'Mechanical Engineering', abbreviation: 'MECH' },
  CIVIL: { name: 'Civil Engineering', abbreviation: 'CIVIL' },
  AUTO: { name: 'Automobile Engineering', abbreviation: 'AUTO' },
  EE: { name: 'Electrical Engineering', abbreviation: 'EE' },
};

class FacultyMatrixUploadService {
  private collegeCache = new Map<string, College>();
  private departmentCache = new Map<string, Department>();
  private academicYearCache = new Map<string, AcademicYear>();
  private semesterCache = new Map<string, Semester>();
  private divisionCache = new Map<string, Division>();
  private subjectCache = new Map<string, Subject>();
  private facultyCache = new Map<string, Faculty>();

  // Fetches data from a given URL with retry logic.
  private async fetchWithRetry(
    url: string,
    options: any,
    maxRetries = 3
  ): Promise<any> {
    if (!url) {
      throw new AppError('Flask server URL is not defined.', 500);
    }

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        const text = await response.text();

        if (!response.ok) {
          try {
            const errorJson = JSON.parse(text);
            throw new AppError(
              `Flask server error: ${errorJson.message || JSON.stringify(errorJson)}`,
              response.status || 500
            );
          } catch {
            throw new AppError(
              `Flask server error: ${text || response.statusText}`,
              response.status || 500
            );
          }
        }

        return JSON.parse(text);
      } catch (error: unknown) {
        const apiError = error as AppError;
        console.error(`Fetch attempt ${i + 1} failed:`, apiError.message);
        if (i === maxRetries - 1) {
          throw apiError;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new AppError('Failed to fetch data after multiple retries.', 500);
  }

  // Finds the AcademicYear record in the database and caches it.
  private async findAcademicYear(yearString: string): Promise<AcademicYear> {
    let academicYear: AcademicYear | null | undefined =
      this.academicYearCache.get(yearString);
    if (academicYear) return academicYear;

    academicYear = await prisma.academicYear.findFirst({
      where: { yearString: yearString, isDeleted: false },
    });

    if (!academicYear) {
      throw new AppError(
        `Academic Year '${yearString}' not found. Please create it first via the Academic Year management API.`,
        400
      );
    }

    this.academicYearCache.set(yearString, academicYear);
    return academicYear;
  }

  // Ensures the College record exists in the database and caches it.
  private async ensureCollege(): Promise<College> {
    let college = this.collegeCache.get(COLLEGE_ID);
    if (!college) {
      college = await prisma.college.upsert({
        where: { id: COLLEGE_ID, isDeleted: false },
        create: {
          id: COLLEGE_ID,
          name: 'LDRP Institute of Technology and Research',
          websiteUrl: 'https://ldrp.ac.in',
          address: 'Sector 15, Gandhinagar, Gujarat',
          contactNumber: '+91-79-23241492',
          isDeleted: false,
        },
        update: {},
      });
      this.collegeCache.set(COLLEGE_ID, college);
    }
    return college;
  }

  // Finds a Department record by its abbreviation or name within the college.
  private async findDepartment(
    deptAbbreviationInput: string,
    collegeId: string
  ): Promise<Department> {
    let department: Department | null | undefined = this.departmentCache.get(
      deptAbbreviationInput
    );
    if (department) return department;

    let canonicalDept: { name: string; abbreviation: string } | undefined;

    canonicalDept = DEPARTMENT_MAPPING[deptAbbreviationInput.toUpperCase()];
    if (!canonicalDept) {
      for (const key in DEPARTMENT_MAPPING) {
        if (
          DEPARTMENT_MAPPING[key].name.toLowerCase() ===
          deptAbbreviationInput.toLowerCase()
        ) {
          canonicalDept = DEPARTMENT_MAPPING[key];
          break;
        }
      }
    }

    const deptNameToSearch = canonicalDept
      ? canonicalDept.name
      : deptAbbreviationInput;

    department = await prisma.department.findFirst({
      where: {
        OR: [
          { abbreviation: deptAbbreviationInput, isDeleted: false },
          { name: deptNameToSearch, isDeleted: false },
        ],
        collegeId: collegeId,
      },
    });

    if (!department) {
      throw new AppError(
        `Department '${deptAbbreviationInput}' not found for College '${collegeId}'. Please ensure the department exists and is not soft-deleted.`,
        400
      );
    }

    this.departmentCache.set(deptAbbreviationInput, department);
    return department;
  }

  // Upserts a Semester record.
  private async upsertSemester(
    departmentId: string,
    semesterNumber: number,
    academicYearId: string,
    semesterType: SemesterTypeEnum
  ): Promise<Semester> {
    const semesterKey = `${departmentId}_${semesterNumber}_${academicYearId}_${semesterType}`;
    let semester = this.semesterCache.get(semesterKey);
    if (semester) return semester;

    semester = await prisma.semester.upsert({
      where: {
        departmentId_semesterNumber_academicYearId_semesterType: {
          departmentId: departmentId,
          semesterNumber: semesterNumber,
          academicYearId: academicYearId,
          semesterType: semesterType,
        },
      },
      create: {
        departmentId: departmentId,
        semesterNumber: semesterNumber,
        academicYearId: academicYearId,
        semesterType: semesterType,
        isDeleted: false,
      },
      update: {
        semesterType: semesterType,
      },
    });
    this.semesterCache.set(semesterKey, semester);
    return semester;
  }

  // Upserts a Division record.
  private async upsertDivision(
    departmentId: string,
    divisionName: string,
    semesterId: string
  ): Promise<Division> {
    const divisionKey = `${departmentId}_${divisionName}_${semesterId}`;
    let division = this.divisionCache.get(divisionKey);
    if (division) return division;

    division = await prisma.division.upsert({
      where: {
        departmentId_divisionName_semesterId: {
          departmentId: departmentId,
          divisionName: divisionName,
          semesterId: semesterId,
        },
      },
      create: {
        departmentId: departmentId,
        semesterId: semesterId,
        divisionName: divisionName,
        studentCount: 0,
        isDeleted: false,
      },
      update: {},
    });
    this.divisionCache.set(divisionKey, division);
    return division;
  }

  // Finds a Subject record by departmentId and abbreviation.
  private async findSubject(
    departmentId: string,
    subjectAbbreviation: string
  ): Promise<Subject> {
    const subjectKey = `${departmentId}_${subjectAbbreviation}`;
    let subject: Subject | null | undefined = this.subjectCache.get(subjectKey);
    if (subject) return subject;

    subject = await prisma.subject.findFirst({
      where: {
        departmentId: departmentId,
        abbreviation: subjectAbbreviation,
        isDeleted: false,
      },
    });

    if (!subject) {
      throw new AppError(
        `Subject with abbreviation '${subjectAbbreviation}' not found or is soft-deleted for department '${departmentId}'.`,
        400
      );
    }

    this.subjectCache.set(subjectKey, subject);
    return subject;
  }

  // Finds a Faculty record by departmentId and abbreviation.
  private async findFaculty(
    departmentId: string,
    facultyAbbreviation: string
  ): Promise<Faculty> {
    const facultyKey = `${departmentId}_${facultyAbbreviation}`;
    let faculty: Faculty | null | undefined = this.facultyCache.get(facultyKey);
    if (faculty) return faculty;

    faculty = await prisma.faculty.findFirst({
      where: {
        departmentId: departmentId,
        abbreviation: facultyAbbreviation,
        isDeleted: false,
      },
    });

    if (!faculty) {
      throw new AppError(
        `Faculty with abbreviation '${facultyAbbreviation}' not found or is soft-deleted for department '${departmentId}'.`,
        400
      );
    }

    this.facultyCache.set(facultyKey, faculty);
    return faculty;
  }

  // Processes the faculty matrix Excel file.
  public async processFacultyMatrix(
    fileBuffer: Buffer,
    academicYearString: string,
    semesterType: SemesterTypeEnum,
    deptAbbreviation: string
  ): Promise<{
    message: string;
    rowsAffected: number;
    missingFaculties: string[];
    missingSubjects: string[];
    totalRowsSkippedDueToMissingEntities: number;
    skippedRowsDetails: string[];
    flaskWarnings: string[];
    flaskErrors: string[];
    flaskSuccess: boolean;
  }> {
    const batchSize = 500;
    let allocationBatch: AllocationBatchItem[] = [];
    let totalAllocationsAdded = 0;
    let totalRowsSkippedDueToMissingEntities = 0;
    const skippedRowsDetails: string[] = [];
    const missingFaculties = new Set<string>();
    const missingSubjects = new Set<string>();
    const flaskWarnings: string[] = [];
    const flaskErrors: string[] = [];
    let flaskSuccess = true;

    if (!FLASK_SERVER) {
      throw new AppError('Flask server URL is not configured.', 500);
    }

    this.collegeCache.clear();
    this.departmentCache.clear();
    this.academicYearCache.clear();
    this.semesterCache.clear();
    this.divisionCache.clear();
    this.subjectCache.clear();
    this.facultyCache.clear();

    const college = await this.ensureCollege();

    const academicYear = await this.findAcademicYear(academicYearString);

    const department = await this.findDepartment(deptAbbreviation, college.id);

    const formData = new FormData();
    formData.append('facultyMatrix', fileBuffer, {
      filename: 'facultyMatrix.xlsx',
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    formData.append('deptAbbreviation', deptAbbreviation);
    formData.append('academicYear', academicYearString);
    formData.append('semesterRun', semesterType);

    let flaskResponse: FlaskResponse;
    try {
      flaskResponse = (await this.fetchWithRetry(`${FLASK_SERVER}`, {
        method: 'POST',
        headers: {
          ...formData.getHeaders(),
          Accept: 'application/json',
        },
        body: formData,
      })) as FlaskResponse;
    } catch (flaskError: any) {
      console.error('Error communicating with Flask server:', flaskError);
      throw new AppError(
        `Failed to get processed data from Flask server: ${flaskError.message || 'Unknown Flask error.'}`,
        flaskError.status || 500
      );
    }

    const processedData = flaskResponse.results;
    flaskSuccess = flaskResponse.status.success;

    if (flaskResponse.status.errors && flaskResponse.status.errors.length > 0) {
      flaskResponse.status.errors.forEach((error) => {
        if (error.toLowerCase().includes('warning')) {
          flaskWarnings.push(error);
        } else {
          flaskErrors.push(error);
        }
      });
    }

    const processingStartTime = Date.now();

    for (const [_collegeName, collegeData] of Object.entries(processedData)) {
      for (const [deptName, deptData] of Object.entries(collegeData)) {
        for (const [semesterNum, semesterData] of Object.entries(deptData)) {
          const parsedSemesterNum = parseInt(semesterNum);
          if (isNaN(parsedSemesterNum)) {
            const message = `Skipping invalid semester number: '${semesterNum}' found in Flask data for department '${deptName}'.`;
            console.warn(message);
            skippedRowsDetails.push(message);
            totalRowsSkippedDueToMissingEntities++;
            continue;
          }

          const expectedSemesterType =
            parsedSemesterNum % 2 !== 0
              ? SemesterTypeEnum.ODD
              : SemesterTypeEnum.EVEN;

          if (expectedSemesterType !== semesterType) {
            const message = `Skipping semester data for Semester ${parsedSemesterNum} (expected ${expectedSemesterType}): Mismatch with provided Semester Run '${semesterType}'.`;
            console.warn(message);
            skippedRowsDetails.push(message);
            totalRowsSkippedDueToMissingEntities++;
            continue;
          }

          let semester: Semester;
          try {
            semester = await this.upsertSemester(
              department.id,
              parsedSemesterNum,
              academicYear.id,
              semesterType
            );
          } catch (error: any) {
            const message = `Skipping semester data for Semester ${parsedSemesterNum}: Could not upsert semester. ${error.message || 'Unknown error'}`;
            console.warn(message);
            skippedRowsDetails.push(message);
            totalRowsSkippedDueToMissingEntities++;
            continue;
          }

          for (const [divisionName, divisionData] of Object.entries(
            semesterData
          )) {
            let division: Division;
            try {
              division = await this.upsertDivision(
                department.id,
                divisionName,
                semester.id
              );
            } catch (error: any) {
              const message = `Skipping division data for Division '${divisionName}': Could not upsert division. ${error.message || 'Unknown error'}`;
              console.warn(message);
              skippedRowsDetails.push(message);
              totalRowsSkippedDueToMissingEntities++;
              continue;
            }

            for (const [subjectAbbreviation, subjectData] of Object.entries(
              divisionData
            )) {
              let subject: Subject;
              try {
                subject = await this.findSubject(
                  department.id,
                  subjectAbbreviation
                );
              } catch (error: any) {
                missingSubjects.add(subjectAbbreviation);
                const message = `Skipping subject allocation for Dept '${department.abbreviation}', Semester '${parsedSemesterNum}', Division '${divisionName}': Subject '${subjectAbbreviation}' not found`;
                console.warn(message);
                skippedRowsDetails.push(message);
                totalRowsSkippedDueToMissingEntities++;
                continue;
              }

              if (subjectData.lectures) {
                const facultyAbbr = subjectData.lectures.designated_faculty;
                let faculty: Faculty;
                try {
                  faculty = await this.findFaculty(department.id, facultyAbbr);

                  const lectureAllocation: AllocationBatchItem = {
                    departmentId: department.id,
                    facultyId: faculty.id,
                    subjectId: subject.id,
                    divisionId: division.id,
                    semesterId: semester.id,
                    lectureType: 'LECTURE',
                    batch: '-',
                    academicYearId: academicYear.id,
                    isDeleted: false,
                  };
                  allocationBatch.push(lectureAllocation);
                } catch (error: any) {
                  missingFaculties.add(facultyAbbr);
                  const message = `Skipping lecture allocation for Subject '${subjectAbbreviation}', Division '${divisionName}': Faculty '${facultyAbbr}' not found`;
                  console.warn(message);
                  skippedRowsDetails.push(message);
                  totalRowsSkippedDueToMissingEntities++;
                }
              }

              if (subjectData.labs) {
                for (const [batch, labData] of Object.entries(
                  subjectData.labs
                )) {
                  const facultyAbbr = labData.designated_faculty;
                  let faculty: Faculty;
                  try {
                    faculty = await this.findFaculty(
                      department.id,
                      facultyAbbr
                    );

                    const labAllocation: AllocationBatchItem = {
                      departmentId: department.id,
                      facultyId: faculty.id,
                      subjectId: subject.id,
                      divisionId: division.id,
                      semesterId: semester.id,
                      lectureType: 'LAB',
                      batch: batch,
                      academicYearId: academicYear.id,
                      isDeleted: false,
                    };
                    allocationBatch.push(labAllocation);
                  } catch (error: any) {
                    missingFaculties.add(facultyAbbr);
                    const message = `Skipping lab allocation for Subject '${subjectAbbreviation}', Division '${divisionName}', Batch '${batch}': Faculty '${facultyAbbr}' not found`;
                    console.warn(message);
                    skippedRowsDetails.push(message);
                    totalRowsSkippedDueToMissingEntities++;
                  }
                }
              }

              if (allocationBatch.length >= batchSize) {
                try {
                  const result = await prisma.subjectAllocation.createMany({
                    data: allocationBatch,
                    skipDuplicates: true,
                  });
                  totalAllocationsAdded += result.count;
                } catch (dbError: any) {
                  const message = `Error inserting batch of SubjectAllocations: ${dbError.message || 'Unknown database error'}`;
                  console.error(message, dbError);
                  skippedRowsDetails.push(message);
                } finally {
                  allocationBatch = [];
                }
              }
            }
          }
        }
      }
    }

    if (allocationBatch.length > 0) {
      try {
        const result = await prisma.subjectAllocation.createMany({
          data: allocationBatch,
          skipDuplicates: true,
        });
        totalAllocationsAdded += result.count;
      } catch (dbError: any) {
        const message = `Error inserting final batch of SubjectAllocations: ${dbError.message || 'Unknown database error'}`;
        console.error(message, dbError);
        skippedRowsDetails.push(message);
      }
    }

    const processingEndTime = Date.now();
    console.log(
      '🕒 Faculty Matrix processing completed in',
      ((processingEndTime - processingStartTime) / 1000).toFixed(2),
      'seconds'
    );

    const noob_data = {
      message: 'Faculty matrix import complete.',
      rowsAffected: totalAllocationsAdded,
      missingFaculties: Array.from(missingFaculties),
      missingSubjects: Array.from(missingSubjects),
      totalRowsSkippedDueToMissingEntities,
      skippedRowsDetails,
      flaskWarnings,
      flaskErrors,
      flaskSuccess,
    };
    console.log(noob_data);

    return {
      message: 'Faculty matrix import complete.',
      rowsAffected: totalAllocationsAdded,
      missingFaculties: Array.from(missingFaculties),
      missingSubjects: Array.from(missingSubjects),
      totalRowsSkippedDueToMissingEntities,
      skippedRowsDetails,
      flaskWarnings,
      flaskErrors,
      flaskSuccess,
    };
  }
}

export const facultyMatrixUploadService = new FacultyMatrixUploadService();
