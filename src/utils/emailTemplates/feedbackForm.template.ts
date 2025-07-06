/**
 * @file src/utils/emailTemplates/feedbackForm.template.ts
 * @description Provides an HTML template string for feedback form invitation emails.
 */

export const getFeedbackFormTemplate = (
  semesterNumber: number,
  divisionName: string,
  formTitle: string,
  accessLink: string,
  apiUrl: string
) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
          color: #333;
        }
        .header {
          background: #2563eb;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #f8fafc;
          padding: 30px;
          border-radius: 0 0 8px 8px;
          border: 1px solid #e2e8f0;
        }
        .button {
          display: inline-block;
          background: #2563eb;
          color: white;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 0.9em;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Feedback Form Invitation</h1>
        </div>
        <div class="content">
          <h2>Semester ${semesterNumber} - Division ${divisionName}</h2>
          <p>You are invited to participate in:</p>
          <h3>${formTitle}</h3>
          <p>Your feedback is valuable and will help improve the academic experience. All responses are completely anonymous.</p>
          <center>
            <a href="${apiUrl}/feedback/${accessLink}" class="button">Access Feedback Form</a>
          </center>
          <p><strong>Note:</strong> This link is uniquely generated for you. Please do not share it with others.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
