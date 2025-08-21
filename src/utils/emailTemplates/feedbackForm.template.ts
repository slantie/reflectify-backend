/**
 * @file src/utils/emailTemplates/feedbackForm.template.ts
 * @description Provides an HTML template string for feedback form invitation emails.
 */

/**
 * Generates the HTML content for a feedback form invitation email.
 * This template is used to inform students about an available feedback form
 * and provide a direct link to access it.
 * @param semesterNumber - The semester number for which the feedback form is relevant.
 * @param divisionName - The name of the division for which the feedback form is relevant.
 * @param formTitle - The title of the feedback form.
 * @param accessLink - The unique access token/ID for the feedback form.
 * @param apiUrl - The base URL of the application's frontend.
 * @returns An HTML string representing the feedback form invitation email.
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
        /* Styles for the main email container */
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1f2937;
          background-color: #ffffff;
        }
        /* Styles for the header section */
        .header {
          background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
          color: white;
          padding: 32px 24px;
          text-align: center;
          border-radius: 12px 12px 0 0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        /* Styles for the header title */
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.025em;
        }
        /* Styles for the main content area */
        .content {
          background: #ffffff;
          padding: 40px 32px;
          border-radius: 0 0 12px 12px;
          border: 1px solid #e5e7eb;
          border-top: none;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        /* Styles for the semester information block */
        .semester-info {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
          text-align: center;
        }
        /* Styles for the semester information heading */
        .semester-info h2 {
          margin: 0;
          color: #ea580c;
          font-size: 20px;
          font-weight: 600;
        }
        /* Styles for the feedback form title */
        .form-title {
          color: #1f2937;
          font-size: 22px;
          font-weight: 600;
          margin: 24px 0 16px 0;
          text-align: center;
        }
        /* Styles for general description paragraphs */
        .description {
          color: #4b5563;
          font-size: 16px;
          line-height: 1.6;
          margin: 16px 0;
        }
        /* Styles for the button container */
        .button-container {
          text-align: center;
          margin: 32px 0;
        }
        /* Styles for the call-to-action button */
        .button {
          display: inline-block;
          text-align: center;
          text: white;
          text-color: white;
          background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
          color: white;
          padding: 16px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(251, 146, 60, 0.3);
        }
        /* Hover effects for the button */
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 15px -3px rgba(251, 146, 60, 0.4);
        }
        /* Styles for the security notice block */
        .security-notice {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          padding: 16px;
          margin: 24px 0;
          color: #92400e;
          font-size: 14px;
        }
        /* Styles for strong text within security notice */
        .security-notice strong {
          color: #78350f;
        }
        /* Styles for the email footer */
        .footer {
          text-align: center;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
        }
        /* Styles for highlighted text */
        .highlight {
          color: #fb923c;
          font-weight: 600;
        }
        /* Styles for inline icons */
        .icon {
          display: inline-block;
          width: 20px;
          height: 20px;
          margin-right: 8px;
          vertical-align: middle;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>📄 Feedback Form Invitation</h1>
        </div>
        <div class="content">
          <div class="semester-info">
            <h2>Semester ${semesterNumber} • Division ${divisionName}</h2>
          </div>
          
          <p class="description">
            You are invited to participate in our feedback initiative. Your input is crucial for enhancing the academic experience.
          </p>
          
          <h3 class="form-title">${formTitle}</h3>
          
          <p class="description">
            This anonymous survey takes just a few minutes to complete. Your honest feedback helps us understand what's working well and where we can improve.
          </p>
          
          <div class="button-container">
            <a href="${apiUrl}/feedback/${accessLink}" class="button">
              ✔️ Access Feedback Form
            </a>
          </div>
          
          <div class="security-notice">
            <strong>🔒 Privacy Notice:</strong> This link is uniquely generated for you and should not be shared. All responses are completely anonymous and confidential.
          </div>
          
          <p class="description">
            Thank you for taking the time to provide your valuable feedback. Your voice matters in shaping a better learning environment.
          </p>
        </div>
        
        <div class="footer">
          <p>This is an automated message from the Academic Feedback System.</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
