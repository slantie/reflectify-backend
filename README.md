# Reflectify Backend API Documentation

## Overview

Reflectify is a comprehensive feedback management system for educational institutions. This API provides endpoints for managing academic structures, feedback forms, analytics, and user authentication.

**Base URL:** `http://localhost:4000/api/v1` (Development) | `https://reflectify-backend.onrender.com/api/v1` (Production)

## 🚨 Important Architectural Change

**Student Data Management**: As of the latest version, the system has migrated from using the legacy `Student` table to the `OverrideStudent` table for all student data management. This is a critical architectural change that affects:

- **Email Distribution**: All feedback form emails are now sent to students managed in the `OverrideStudent` table
- **Form Access**: `FormAccess` records are created with `overrideStudentId` references instead of `studentId`
- **Data Integrity**: The legacy `Student` table is no longer used for active operations
- **Database Relations**: All student-related queries now target the `OverrideStudent` model

### Email Queue System

The system uses **Redis + BullMQ** for reliable email delivery with the following configuration:

- **Rate Limiting**: 1 email per 4 seconds with exponential backoff
- **Retry Logic**: 5 attempts with exponential delay starting at 4 seconds
- **Queue Processing**: Background job processing with Gmail SMTP integration
- **Fallback Mechanism**: Direct email sending when queue is unavailable

## Authentication & Authorization

### Authentication Types

1. **JWT Authentication** - Used for admin/faculty access
2. **Service API Key** - Used for service-to-service communication
3. **Token-based Access** - Used for student feedback submissions

### User Roles

- `SUPER_ADMIN` - Full system access
- `HOD` - Head of Department privileges
- `AsstProf` - Assistant Professor privileges
- `LabAsst` - Lab Assistant privileges

### Authentication Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Service API Headers

```
x-api-key: <service_api_key>
Content-Type: application/json
```

## Standard Response Format

### Success Response

```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response

```json
{
  "status": "fail" | "error",
  "message": "Error description"
}
```

## Core Endpoints

### 1. Authentication (`/auth`)

#### Register Admin

```
POST /auth/register
Access: Public
```

**Request Body:**

```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "designation": "HOD | AsstProf | LabAsst"
}
```

#### Register Super Admin

```
POST /auth/super-register
Access: Public (restricted by business logic)
```

**Request Body:**

```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "designation": "SUPER_ADMIN"
}
```

#### Login

```
POST /auth/login
Access: Public
```

**Request Body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Logged in successfully",
  "token": "jwt_token",
  "data": {
    "admin": {
      "id": "string",
      "name": "string",
      "email": "string",
      "designation": "string",
      "isSuper": "boolean"
    }
  }
}
```

#### Get Current User Profile

```
GET /auth/me
Access: Private (All authenticated users)
Headers: Authorization: Bearer <token>
```

#### Update Password

```
PATCH /auth/update-password
Access: Private (All authenticated users)
Headers: Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

### 2. Academic Years (`/academic-years`)

#### Get All Academic Years

```
GET /academic-years
Access: Private (All authenticated users)
```

#### Create Academic Year

```
POST /academic-years
Access: Private (SUPER_ADMIN, HOD)
```

**Request Body:**

```json
{
  "yearString": "2024-25",
  "startDate": "2024-08-01T00:00:00.000Z",
  "endDate": "2025-07-31T00:00:00.000Z",
  "isActive": true
}
```

#### Get Academic Year by ID

```
GET /academic-years/:id
Access: Private (All authenticated users)
```

#### Update Academic Year

```
PATCH /academic-years/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Delete Academic Year

```
DELETE /academic-years/:id
Access: Private (SUPER_ADMIN, HOD)
```

### 3. Colleges (`/colleges`)

#### Get All Colleges

```
GET /colleges
Access: Private (All authenticated users)
```

#### Create/Upsert Primary College

```
POST /colleges
Access: Private (SUPER_ADMIN)
```

#### Get Primary College

```
GET /colleges/primary
Access: Private (All authenticated users)
```

#### Update Primary College

```
PATCH /colleges/primary
Access: Private (SUPER_ADMIN, HOD)
```

#### Delete Primary College

```
DELETE /colleges/primary
Access: Private (SUPER_ADMIN)
```

#### Batch Update Primary College

```
PATCH /colleges/primary/batch-update
Access: Private (SUPER_ADMIN, HOD)
```

### 4. Departments (`/departments`)

#### Get All Departments

```
GET /departments
Access: Private (All authenticated users)
Query Parameters: ?collegeId=<id>&isActive=<boolean>
```

#### Create Department

```
POST /departments
Access: Private (SUPER_ADMIN, HOD)
```

**Request Body:**

```json
{
  "name": "Computer Science",
  "abbreviation": "CS",
  "collegeId": "string"
}
```

#### Get Department by ID

```
GET /departments/:id
Access: Private (All authenticated users)
```

#### Update Department

```
PATCH /departments/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Delete Department

```
DELETE /departments/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Batch Create Departments

```
POST /departments/batch
Access: Private (SUPER_ADMIN, HOD)
```

### 5. Semesters (`/semesters`)

#### Get All Semesters

```
GET /semesters
Access: Private (All authenticated users)
Query Parameters: ?departmentId=<id>&academicYearId=<id>&semesterNumber=<number>
```

#### Create Semester

```
POST /semesters
Access: Private (SUPER_ADMIN, HOD)
```

**Request Body:**

```json
{
  "semesterNumber": 1,
  "semesterType": "ODD | EVEN",
  "departmentId": "string",
  "academicYearId": "string"
}
```

#### Get Semester by ID

```
GET /semesters/:id
Access: Private (All authenticated users)
```

#### Update Semester

```
PATCH /semesters/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Delete Semester

```
DELETE /semesters/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Batch Create Semesters

```
POST /semesters/batch
Access: Private (SUPER_ADMIN, HOD)
```

#### Get Semesters by Department

```
GET /semesters/dept/:id
Access: Private (SUPER_ADMIN, HOD, AsstProf, LabAsst)
```

### 6. Divisions (`/divisions`)

#### Get All Divisions

```
GET /divisions
Access: Private (All authenticated users)
Query Parameters: ?departmentId=<id>&semesterId=<id>
```

#### Create Division

```
POST /divisions
Access: Private (SUPER_ADMIN, HOD)
```

**Request Body:**

```json
{
  "name": "A",
  "capacity": 60,
  "semesterId": "string"
}
```

#### Get Division by ID

```
GET /divisions/:id
Access: Private (All authenticated users)
```

#### Update Division

```
PATCH /divisions/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Delete Division

```
DELETE /divisions/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Batch Create Divisions

```
POST /divisions/batch
Access: Private (SUPER_ADMIN, HOD)
```

### 7. Subjects (`/subjects`)

#### Get All Subjects

```
GET /subjects
Access: Private (SUPER_ADMIN, HOD, AsstProf)
Query Parameters: ?semesterId=<id>&subjectType=<MANDATORY|ELECTIVE>
```

#### Create Subject

```
POST /subjects
Access: Private (SUPER_ADMIN, HOD)
```

**Request Body:**

```json
{
  "name": "Data Structures",
  "code": "CS201",
  "abbreviation": "DS",
  "credits": 4,
  "subjectType": "MANDATORY | ELECTIVE",
  "semesterId": "string"
}
```

#### Get Subject by ID

```
GET /subjects/:id
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Update Subject

```
PATCH /subjects/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Delete Subject

```
DELETE /subjects/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Get Subjects by Semester

```
GET /subjects/semester/:semesterId
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Get Subject Abbreviations

```
GET /subjects/abbreviations/:deptAbbr?
Access: Private (All authenticated users)
```

#### Batch Create Subjects

```
POST /subjects/batch
Access: Private (SUPER_ADMIN, HOD)
```

### 8. Faculty (`/faculties`)

#### Get All Faculties

```
GET /faculties
Access: Private (All authenticated users)
Query Parameters: ?departmentId=<id>&designation=<string>
```

#### Create Faculty

```
POST /faculties
Access: Private (SUPER_ADMIN, HOD)
```

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "employeeId": "EMP001",
  "abbreviation": "JD",
  "designation": "Professor",
  "departmentId": "string"
}
```

#### Get Faculty by ID

```
GET /faculties/:id
Access: Private (All authenticated users)
```

#### Update Faculty

```
PATCH /faculties/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Delete Faculty

```
DELETE /faculties/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Get Faculty Abbreviations

```
GET /faculties/abbreviations/:deptAbbr?
Access: Private (All authenticated users)
```

#### Batch Create Faculties

```
POST /faculties/batch
Access: Private (SUPER_ADMIN, HOD)
```

### 9. Students (`/students`)

#### Get All Students

```
GET /students
Access: Private (All authenticated users)
Query Parameters: ?divisionId=<id>&academicYearId=<id>&rollNumber=<string>
```

#### Create Student

```
POST /students
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

**Request Body:**

```json
{
  "name": "Jane Smith",
  "email": "jane.smith@student.edu",
  "rollNumber": "2024CS001",
  "divisionId": "string",
  "academicYearId": "string"
}
```

#### Get Student by ID

```
GET /students/:id
Access: Private (All authenticated users)
```

#### Update Student

```
PATCH /students/:id
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Delete Student

```
DELETE /students/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Batch Create Students

```
POST /students/batch
Access: Private (SUPER_ADMIN, HOD)
```

### 10. Subject Allocations (`/subject-allocations`)

#### Get All Subject Allocations

```
GET /subject-allocations
Access: Private (SUPER_ADMIN, HOD, AsstProf)
Query Parameters: ?facultyId=<id>&subjectId=<id>&divisionId=<id>&lectureType=<type>
```

#### Create Subject Allocation

```
POST /subject-allocations
Access: Private (SUPER_ADMIN, HOD)
```

**Request Body:**

```json
{
  "facultyId": "string",
  "subjectId": "string",
  "divisionId": "string",
  "academicYearId": "string",
  "lectureType": "LECTURE | LAB | TUTORIAL | SEMINAR | PROJECT"
}
```

#### Get Subject Allocation by ID

```
GET /subject-allocations/:id
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Update Subject Allocation

```
PATCH /subject-allocations/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Delete Subject Allocation

```
DELETE /subject-allocations/:id
Access: Private (SUPER_ADMIN, HOD)
```

### 11. Feedback Questions (`/feedback-questions`)

#### Get All Question Categories

```
GET /feedback-questions/categories
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Create Question Category

```
POST /feedback-questions/categories
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

**Request Body:**

```json
{
  "name": "Teaching Effectiveness",
  "description": "Questions related to teaching methods"
}
```

#### Get Question Category by ID

```
GET /feedback-questions/categories/:id
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Update Question Category

```
PATCH /feedback-questions/categories/:id
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Delete Question Category

```
DELETE /feedback-questions/categories/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Get Feedback Questions by Form ID

```
GET /feedback-questions/form/:formId/questions
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Create Feedback Question

```
POST /feedback-questions/form/:formId/questions
Access: Private (SUPER_ADMIN, HOD)
```

**Request Body:**

```json
{
  "questionText": "How would you rate the clarity of explanation?",
  "questionType": "RATING | TEXT | MULTIPLE_CHOICE",
  "categoryId": "string",
  "isRequired": true,
  "order": 1
}
```

#### Update Feedback Question

```
PATCH /feedback-questions/questions/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Delete Feedback Question

```
DELETE /feedback-questions/questions/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Batch Update Feedback Questions

```
PATCH /feedback-questions/questions/batch
Access: Private (SUPER_ADMIN, HOD)
```

### 12. Feedback Forms (`/feedback-forms`)

#### Get Form by Access Token

```
GET /feedback-forms/access/:token
Access: Public (Token-based)
```

#### Get All Forms

```
GET /feedback-forms
Access: Private (SUPER_ADMIN, HOD, AsstProf)
Query Parameters: ?status=<DRAFT|ACTIVE|CLOSED>&semesterId=<id>
```

#### Get Form by ID

```
GET /feedback-forms/:id
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Update Form

```
PATCH /feedback-forms/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Delete Form

```
DELETE /feedback-forms/:id
Access: Private (SUPER_ADMIN, HOD)
```

#### Generate Forms

```
POST /feedback-forms/generate
Access: Private (SUPER_ADMIN, HOD)
```

**Request Body:**

```json
{
  "semesterId": "string",
  "title": "Mid-semester Feedback",
  "description": "Feedback for mid-semester evaluation",
  "questionCategoryIds": ["string"]
}
```

#### Bulk Update Form Status

```
PATCH /feedback-forms/bulk-status
Access: Private (SUPER_ADMIN, HOD)
```

#### Add Question to Form

```
POST /feedback-forms/:id/questions
Access: Private (SUPER_ADMIN, HOD)
```

#### Update Form Status

```
PATCH /feedback-forms/:id/status
Access: Private (SUPER_ADMIN, HOD)
```

### 13. Student Responses (`/student-responses`)

#### Submit Responses

```
POST /student-responses/submit/:token
Access: Public (Token-based)
```

**Request Body:**

```json
{
  "responses": [
    {
      "questionId": "string",
      "rating": 5,
      "textResponse": "string"
    }
  ]
}
```

#### Check Submission Status

```
GET /student-responses/check-submission/:token
Access: Public (Token-based)
```

### 14. Analytics (`/analytics`)

#### Get Semesters with Responses

```
GET /analytics/semesters-with-responses
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Get Overall Semester Rating

```
GET /analytics/semesters/:id/overall-rating
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Get Subject-wise Lecture/Lab Rating

```
GET /analytics/semesters/:id/subject-wise-rating
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Get High Impact Feedback Areas

```
GET /analytics/semesters/:id/high-impact-areas
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Get Semester Trend Analysis

```
GET /analytics/semester-trend-analysis
Access: Private (SUPER_ADMIN, HOD, AsstProf)
Query Parameters: ?subjectId=<id>
```

#### Get Annual Performance Trend

```
GET /analytics/annual-performance-trend
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Get Division Batch Comparisons

```
GET /analytics/semesters/:id/division-batch-comparisons
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Get Lab Lecture Comparison

```
GET /analytics/semesters/:id/lab-lecture-comparison
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Get Faculty Performance Year Data

```
GET /analytics/faculty/:facultyId/performance/:academicYearId
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Get All Faculty Performance Data

```
GET /analytics/faculty/performance/:academicYearId
Access: Private (SUPER_ADMIN, HOD)
```

#### Get Total Responses

```
GET /analytics/total-responses
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Get Semester Divisions with Responses

```
GET /analytics/semester-divisions-with-responses
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

### 15. Visual Analytics (`/analytics/visual`)

#### Get Grouped Bar Chart Data

```
GET /analytics/visual/grouped-bar-chart/:facultyId
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Get Line Chart Data

```
GET /analytics/visual/line-chart/:facultyId
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Get Unique Faculties

```
GET /analytics/visual/unique-faculties
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Get Unique Subjects

```
GET /analytics/visual/unique-subjects
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Get Faculty Radar Data

```
GET /analytics/visual/radar-chart/:facultyId
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

#### Get Subject Performance Data

```
GET /analytics/visual/subject-performance/:subjectId
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

### 16. Dashboard (`/dashboard`)

#### Get Dashboard Statistics

```
GET /dashboard/stats
Access: Private (SUPER_ADMIN, HOD, AsstProf)
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "totalStudents": 1500,
    "totalFaculty": 80,
    "totalDepartments": 8,
    "activeFeedbackForms": 5,
    "totalResponses": 12000,
    "responseRate": 85.5
  }
}
```

### 17. Academic Structure (`/academic-structure`)

#### Get Academic Structure

```
GET /academic-structure
Access: Private (All authenticated users)
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "colleges": [
      {
        "id": "string",
        "name": "string",
        "departments": [
          {
            "id": "string",
            "name": "string",
            "semesters": [
              {
                "id": "string",
                "semesterNumber": 1,
                "divisions": [
                  {
                    "id": "string",
                    "name": "A",
                    "capacity": 60
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### 18. Upload (`/upload`)

#### Upload Student Data

```
POST /upload/student-data
Access: Private (SUPER_ADMIN, HOD)
Content-Type: multipart/form-data
```

**Form Data:**

- `file`: Excel file containing student data

#### Upload Faculty Data

```
POST /upload/faculty-data
Access: Private (SUPER_ADMIN, HOD)
Content-Type: multipart/form-data
```

**Form Data:**

- `file`: Excel file containing faculty data

#### Upload Subject Data

```
POST /upload/subject-data
Access: Private (SUPER_ADMIN, HOD)
Content-Type: multipart/form-data
```

**Form Data:**

- `file`: Excel file containing subject data

#### Upload Faculty Matrix

```
POST /upload/faculty-matrix
Access: Private (SUPER_ADMIN, HOD)
Content-Type: multipart/form-data
```

**Form Data:**

- `file`: Excel file containing faculty allocation matrix

### 19. Email (`/emails`)

#### Send Form Access Emails

```
POST /emails/send-form-access
Access: Private (SUPER_ADMIN, HOD)
```

**Request Body:**

```json
{
  "formId": "string",
  "recipientGroups": ["students", "faculty"]
}
```

### 20. Database (`/database`)

#### Clean Database

```
DELETE /database/clean
Access: Private (SUPER_ADMIN only)
```

## Service-to-Service Endpoints (`/service`)

These endpoints require API key authentication via `x-api-key` header.

### Faculty Service Endpoints

#### Get Faculty Abbreviations

```
GET /service/faculties/abbreviations
Access: Service (API Key required)
```

#### Get Faculty Abbreviations by Department

```
GET /service/faculties/abbreviations/:deptId
Access: Service (API Key required)
```

### Subject Service Endpoints

#### Get Subject Abbreviations

```
GET /service/subjects/abbreviations
Access: Service (API Key required)
```

#### Get Subject Abbreviations by Department

```
GET /service/subjects/abbreviations/:deptId
Access: Service (API Key required)
```

## System Endpoints

### Health Check

```
GET /health
Access: Public
```

**Response:**

```json
{
  "message": "Backend API's running at /api/v1"
}
```

## Error Handling

### Common Error Codes

- `400` - Bad Request (Invalid input data)
- `401` - Unauthorized (Invalid credentials or missing token)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found (Resource not found)
- `409` - Conflict (Duplicate data)
- `422` - Unprocessable Entity (Validation errors)
- `500` - Internal Server Error

### Validation Errors

When request validation fails, the API returns detailed error information:

```json
{
  "status": "fail",
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General endpoints**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 5 requests per 15 minutes per IP
- **Upload endpoints**: 10 requests per hour per user

## Environment Configuration

### Required Environment Variables

```env
DATABASE_URL=postgresql://username:password@localhost:5432/reflectify
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
SERVICE_API_KEY=your-service-api-key
NODE_ENV=development|production
PORT=4000

# Email Configuration (Gmail SMTP)
SMTP_USER=your-gmail-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=your-display-name@gmail.com

# Redis Configuration (for email queue)
REDIS_URL=rediss://your-redis-url:6379

# Frontend URLs (for email links)
FRONTEND_DEV_URL=http://localhost:3000
FRONTEND_PROD_URL=https://your-production-domain.com
```

### CORS Configuration

- **Development**: All origins allowed
- **Production**: Only `https://reflectify.live` allowed

## Data Models

### Key Enums

```typescript
enum Designation {
  SUPER_ADMIN
  HOD
  AsstProf
  LabAsst
}

enum SubjectType {
  MANDATORY
  ELECTIVE
}

enum LectureType {
  LECTURE
  LAB
  TUTORIAL
  SEMINAR
  PROJECT
}

enum FormStatus {
  DRAFT
  ACTIVE
  CLOSED
}

enum SemesterTypeEnum {
  ODD
  EVEN
}
```

## Testing

### Test Client Example

```javascript
const fetch = require('node-fetch');

const baseUrl = 'http://localhost:4000/api/v1';
const token = 'your-jwt-token';

// Example: Get all departments
const response = await fetch(`${baseUrl}/departments`, {
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
console.log(data);
```

## Security Features

1. **Helmet.js** - Security headers
2. **CORS** - Cross-origin resource sharing
3. **JWT** - Token-based authentication
4. **Role-based authorization** - Fine-grained access control
5. **Input validation** - Zod schema validation
6. **SQL injection protection** - Prisma ORM
7. **Rate limiting** - Request throttling

## Deployment

### Production Considerations

1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure proper CORS origins
4. Set up SSL/TLS certificates
5. Use environment variables for sensitive data
6. Enable request logging
7. Set up monitoring and alerting

---

_This documentation covers all available endpoints in the Reflectify Backend API. For additional support or clarification, please refer to the source code or contact the development team._
