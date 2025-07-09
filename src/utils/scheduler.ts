/**
 * @file src/utils/scheduler.ts
 * @description Utility for scheduling automated tasks in the application
 * Handles periodic tasks like expiring old feedback forms
 */

import { feedbackFormService } from '../services/feedbackForm/feedbackForm.service';

/**
 * Sets up all scheduled tasks for the application
 */
export const setupScheduledTasks = () => {
  // Schedule the form expiration task to run daily at midnight
  scheduleFormExpiration();
};

/**
 * Schedules the feedback form expiration task
 * Runs daily to expire forms older than 7 days
 */
const scheduleFormExpiration = () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Function to run the expiration task
  const runExpirationTask = async () => {
    try {
      console.log('[Scheduler] Running feedback form expiration task...');
      const count = await feedbackFormService.expireOldForms();
      console.log(`[Scheduler] Successfully expired ${count} feedback forms.`);
    } catch (error) {
      console.error('[Scheduler] Error expiring feedback forms:', error);
    }

    // Schedule the next run
    setTimeout(runExpirationTask, ONE_DAY_MS);
  };

  // Run immediately once and then schedule
  runExpirationTask();

  console.log('[Scheduler] Form expiration task scheduled successfully.');
};
