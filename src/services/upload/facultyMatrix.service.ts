/**
 * @file src/services/upload/facultyMatrix.service.ts
 * @description Service layer for handling faculty matrix upload and processing.
 * It interacts with an external Flask server for data parsing and manages
 * the creation/updating of SubjectAllocation records in the database.
 */

import FormData from 'form-data';
import fetch from 'node-fetch'; // Using node-fetch for HTTP requests
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
import { prisma } from '../common/prisma.service'; // Import the singleton Prisma client
import AppError from '../../utils/appError'; // Import AppError

// Configuration constants
const FLASK_SERVER =
  process.env.NODE_ENV === 'development'
    ? process.env.FLASK_DEV_SERVER
    : process.env.FLASK_PROD_SERVER;
const COLLEGE_ID = 'LDRP-ITR'; // Hardcoded college ID

/**
 * NOTE: Flask server should use SERVICE_API_KEY from environment to authenticate
 * with our backend service endpoints:
 * - GET /api/v1/service/faculties/abbreviations (with header: x-api-key: ${SERVICE_API_KEY})
 * - GET /api/v1/service/subjects/abbreviations (with header: x-api-key: ${SERVICE_API_KEY})
 */

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

interface AllocationBatchItem {
  departmentId: string;
  facultyId: string;
  subjectId: string;
  divisionId: string;
  semesterId: string;
  lectureType: 'LECTURE' | 'LAB' | 'TUTORIAL' | 'SEMINAR' | 'PROJECT'; // Ensure all enum values are covered
  batch: string;
  academicYearId: string;
  isDeleted: boolean;
}

// --- Canonical Department Mapping (re-used from other services, placed here for self-containment) ---
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
  // Add any other departments here
};

class FacultyMatrixUploadService {
  // Caches for the current request lifecycle
  private collegeCache = new Map<string, College>();
  private departmentCache = new Map<string, Department>();
  private academicYearCache = new Map<string, AcademicYear>();
  private semesterCache = new Map<string, Semester>();
  private divisionCache = new Map<string, Division>();
  private subjectCache = new Map<string, Subject>();
  private facultyCache = new Map<string, Faculty>();

  /**
   * @dev Fetches data from a given URL with retry logic.
   * @param {string} url - The URL to fetch from.
   * @param {object} options - Fetch options (method, headers, body).
   * @param {number} maxRetries - Maximum number of retries.
   * @returns {Promise<any>} The parsed JSON response.
   * @throws {AppError} If the fetch fails after max retries or returns a non-OK status.
   * @private
   */
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
        const text = await response.text(); // Read as text first to handle non-JSON errors

        if (!response.ok) {
          // Attempt to parse JSON error from Flask, or use plain text
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

        return JSON.parse(text); // Parse JSON if response is OK
      } catch (error: unknown) {
        const apiError = error as AppError; // Cast to AppError for consistent type
        console.error(`Fetch attempt ${i + 1} failed:`, apiError.message);
        if (i === maxRetries - 1) {
          throw apiError; // Re-throw the AppError after max retries
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
      }
    }
    throw new AppError('Failed to fetch data after multiple retries.', 500); // Should not be reached
  }

  /**
   * @dev Finds the AcademicYear record in the database and caches it.
   * It does NOT create the academic year if it doesn't exist.
   * @param {string} yearString - The academic year string (e.g., "2024-2025").
   * @returns {Promise<AcademicYear>} The AcademicYear record.
   * @private
   * @throws AppError if the academic year is not found.
   */
  private async findAcademicYear(yearString: string): Promise<AcademicYear> {
    // Corrected type: Allow null or undefined from cache
    let academicYear: AcademicYear | null | undefined =
      this.academicYearCache.get(yearString);
    if (academicYear) return academicYear;

    academicYear = await prisma.academicYear.findFirst({
      where: { yearString: yearString, isDeleted: false }, // Only consider non-soft-deleted academic years
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

  /**
   * @dev Ensures the College record exists in the database and caches it.
   * @returns {Promise<College>} The College record.
   * @private
   */
  private async ensureCollege(): Promise<College> {
    let college = this.collegeCache.get(COLLEGE_ID);
    if (!college) {
      college = await prisma.college.upsert({
        where: { id: COLLEGE_ID, isDeleted: false }, // Filter out soft-deleted colleges
        create: {
          id: COLLEGE_ID,
          name: 'LDRP Institute of Technology and Research',
          websiteUrl: 'https://ldrp.ac.in',
          address: 'Sector 15, Gandhinagar, Gujarat',
          contactNumber: '+91-79-23241492',
          logo: 'ldrp-logo.png',
          images: {}, // Assuming images is a JSON field or similar
          isDeleted: false, // Ensure new college is not soft-deleted
        },
        update: {}, // No specific update data needed if it already exists
      });
      this.collegeCache.set(COLLEGE_ID, college);
    }
    return college;
  }

  /**
   * @dev Finds a Department record by its abbreviation or name within the college.
   * Caches the result. Does not create the department if not found.
   * @param deptAbbreviationInput The abbreviation or name of the department.
   * @param collegeId The ID of the associated college.
   * @returns {Promise<Department>} The Department record.
   * @private
   * @throws AppError if the department is not found.
   */
  private async findDepartment(
    deptAbbreviationInput: string,
    collegeId: string
  ): Promise<Department> {
    // Corrected type: Allow null or undefined from cache
    let department: Department | null | undefined = this.departmentCache.get(
      deptAbbreviationInput
    );
    if (department) return department;

    let canonicalDept: { name: string; abbreviation: string } | undefined;

    // Attempt to find canonical department details from our mapping
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

  /**
   * @dev Upserts a Semester record. Caches the result.
   * @param departmentId The ID of the associated department.
   * @param semesterNumber The semester number.
   * @param academicYearId The ID of the associated academic year.
   * @param semesterType The type of semester (ODD/EVEN).
   * @returns {Promise<Semester>} The Semester record.
   * @private
   */
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
        isDeleted: false, // Only consider non-soft-deleted semesters
      },
      create: {
        departmentId: departmentId,
        semesterNumber: semesterNumber,
        academicYearId: academicYearId,
        semesterType: semesterType,
        isDeleted: false,
      },
      update: {
        semesterType: semesterType, // Ensure consistency
      },
    });
    this.semesterCache.set(semesterKey, semester);
    return semester;
  }

  /**
   * @dev Upserts a Division record. Caches the result.
   * @param departmentId The ID of the associated department.
   * @param divisionName The name of the division.
   * @param semesterId The ID of the associated semester.
   * @returns {Promise<Division>} The Division record.
   * @private
   */
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
        isDeleted: false, // Only consider non-soft-deleted divisions
      },
      create: {
        departmentId: departmentId,
        semesterId: semesterId,
        divisionName: divisionName,
        studentCount: 0, // Initial count
        isDeleted: false,
      },
      update: {}, // No specific update needed if found
    });
    this.divisionCache.set(divisionKey, division);
    return division;
  }

  /**
   * @dev Finds a Subject record by departmentId and abbreviation. Caches the result.
   * @param departmentId The ID of the associated department.
   * @param subjectAbbreviation The abbreviation of the subject.
   * @returns {Promise<Subject>} The Subject record.
   * @private
   * @throws AppError if the subject is not found.
   */
  private async findSubject(
    departmentId: string,
    subjectAbbreviation: string
  ): Promise<Subject> {
    const subjectKey = `${departmentId}_${subjectAbbreviation}`;
    // Corrected type: Allow null or undefined from cache
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

  /**
   * @dev Finds a Faculty record by departmentId and abbreviation. Caches the result.
   * @param departmentId The ID of the associated department.
   * @param facultyAbbreviation The abbreviation of the faculty.
   * @returns {Promise<Faculty>} The Faculty record.
   * @private
   * @throws AppError if the faculty is not found.
   */
  private async findFaculty(
    departmentId: string,
    facultyAbbreviation: string
  ): Promise<Faculty> {
    const facultyKey = `${departmentId}_${facultyAbbreviation}`;
    // Corrected type: Allow null or undefined from cache
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

  /**
   * @description Processes the faculty matrix Excel file.
   * It sends the file to a Flask server for initial parsing, then iterates
   * through the processed data to create/update SubjectAllocation records.
   * @param fileBuffer The buffer of the uploaded Excel file.
   * @param academicYearString The academic year string (e.g., "2024-2025").
   * @param semesterType The type of semester (ODD/EVEN).
   * @param deptAbbreviation The abbreviation of the department.
   * @returns {Promise<{ message: string; rowsAffected: number; totalRowsSkippedDueToMissingEntities: number; skippedRowsDetails: string[]; }>}
   * A summary of the processing results.
   * @throws AppError if file processing fails or essential data is missing.
   */
  public async processFacultyMatrix(
    fileBuffer: Buffer,
    academicYearString: string,
    semesterType: SemesterTypeEnum,
    deptAbbreviation: string
  ): Promise<{
    message: string;
    rowsAffected: number;
  }> {
    const batchSize = 500; // Number of allocations to process in a single Prisma createMany operation
    let allocationBatch: AllocationBatchItem[] = [];
    let totalAllocationsAdded = 0; // Counts successfully added allocations (not duplicates)
    let totalRowsSkippedDueToMissingEntities = 0; // Counts rows from Flask output where subject or faculty could not be found
    const skippedRowsDetails: string[] = []; // Array to store details of skipped rows for frontend

    // Ensure Flask server URL is configured
    if (!FLASK_SERVER) {
      throw new AppError('Flask server URL is not configured.', 500);
    }

    // Clear caches at the beginning of the request to ensure fresh data
    this.collegeCache.clear();
    this.departmentCache.clear();
    this.academicYearCache.clear();
    this.semesterCache.clear();
    this.divisionCache.clear();
    this.subjectCache.clear();
    this.facultyCache.clear();

    // Ensure college record exists
    const college = await this.ensureCollege();

    // Find the AcademicYear for the provided academicYearString (crucial pre-check)
    const academicYear = await this.findAcademicYear(academicYearString);
    // findAcademicYear throws AppError if not found, so no need for if (!academicYear) check here.

    // Find the department based on the provided abbreviation and college ID
    const department = await this.findDepartment(deptAbbreviation, college.id);
    // findDepartment throws AppError if not found, so no need for if (!department) check here.

    // Prepare form data to send to Flask server
    const formData = new FormData();
    formData.append('facultyMatrix', fileBuffer, {
      filename: 'facultyMatrix.xlsx',
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    formData.append('deptAbbreviation', deptAbbreviation);
    formData.append('academicYear', academicYearString);
    formData.append('semesterRun', semesterType); // Pass the validated enum value

    let processedData: ProcessedData;
    try {
      processedData = (await this.fetchWithRetry(`${FLASK_SERVER}`, {
        method: 'POST',
        headers: {
          ...formData.getHeaders(),
          Accept: 'application/json',
        },
        body: formData,
      })) as ProcessedData;
    } catch (flaskError: any) {
      console.error('Error communicating with Flask server:', flaskError);
      throw new AppError(
        `Failed to get processed data from Flask server: ${flaskError.message || 'Unknown Flask error.'}`,
        flaskError.status || 500
      );
    }

    const processingStartTime = Date.now();

    // Iterate through the processed data received from the Flask server
    for (const [_collegeName, collegeData] of Object.entries(processedData)) {
      for (const [deptName, deptData] of Object.entries(collegeData)) {
        // Ensure deptName from Flask matches our department (optional, but good for sanity check)
        // if (deptName !== department.name && deptName !== department.abbreviation) {
        //   console.warn(`Flask data department name mismatch: Expected '${department.name}' or '${department.abbreviation}', got '${deptName}'. Processing anyway.`);
        // }

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

          // Validate that the semester number from Flask data matches the expected semester type
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
                const message = `Skipping subject allocation for Dept '${department.abbreviation}', Semester '${parsedSemesterNum}', Division '${divisionName}': ${error.message || 'Unknown error'}`;
                console.warn(message);
                skippedRowsDetails.push(message);
                totalRowsSkippedDueToMissingEntities++;
                continue; // Skip to next subject if not found
              }

              // Process Lectures
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
                    lectureType: 'LECTURE', // Assuming 'LECTURE' for lectures
                    batch: '-', // Default batch for lectures
                    academicYearId: academicYear.id,
                    isDeleted: false,
                  };
                  allocationBatch.push(lectureAllocation);
                } catch (error: any) {
                  const message = `Skipping lecture allocation for Subject '${subjectAbbreviation}', Division '${divisionName}': ${error.message || 'Unknown error'}`;
                  console.warn(message);
                  skippedRowsDetails.push(message);
                  totalRowsSkippedDueToMissingEntities++;
                }
              }

              // Process Labs
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
                      lectureType: 'LAB', // Assuming 'LAB' for labs
                      batch: batch,
                      academicYearId: academicYear.id,
                      isDeleted: false,
                    };
                    allocationBatch.push(labAllocation);
                  } catch (error: any) {
                    const message = `Skipping lab allocation for Subject '${subjectAbbreviation}', Division '${divisionName}', Batch '${batch}': ${error.message || 'Unknown error'}`;
                    console.warn(message);
                    skippedRowsDetails.push(message);
                    totalRowsSkippedDueToMissingEntities++;
                  }
                }
              }

              // Check batch size and insert allocations
              if (allocationBatch.length >= batchSize) {
                try {
                  const result = await prisma.subjectAllocation.createMany({
                    data: allocationBatch,
                    skipDuplicates: true, // Allocations that are exact duplicates will be skipped by Prisma
                  });
                  totalAllocationsAdded += result.count;
                } catch (dbError: any) {
                  const message = `Error inserting batch of SubjectAllocations: ${dbError.message || 'Unknown database error'}`;
                  console.error(message, dbError);
                  skippedRowsDetails.push(message);
                  // These are not "skipped rows" from Flask, but failed DB inserts.
                  // Decided not to increment totalRowsSkippedDueToMissingEntities here.
                } finally {
                  allocationBatch = []; // Reset batch regardless of success/failure
                }
              }
            }
          }
        }
      }
    }

    // Insert any remaining allocations in the final batch
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

    return {
      message: 'Faculty matrix import complete.',
      rowsAffected: totalAllocationsAdded,
    };
  }
}

export const facultyMatrixUploadService = new FacultyMatrixUploadService();
