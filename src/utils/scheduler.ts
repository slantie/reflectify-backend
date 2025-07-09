/**
 * @file src/utils/scheduler.ts
 * @description Utility for scheduling automated tasks in the application.
 */

import { feedbackFormService } from '../services/feedbackForm/feedbackForm.service';

// Sets up all recurring scheduled tasks for the application.
export const setupScheduledTasks = () => {
  scheduleFormExpiration();
};

// Schedules the feedback form expiration task to run periodically.
const scheduleFormExpiration = () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // Defines the asynchronous function that performs the expiration task.
  const runExpirationTask = async () => {
    try {
      console.log('[Scheduler] Running feedback form expiration task...');
      const count = await feedbackFormService.expireOldForms();
      console.log(`[Scheduler] Successfully expired ${count} feedback forms.`);
    } catch (error) {
      console.error('[Scheduler] Error expiring feedback forms:', error);
    }

    setTimeout(runExpirationTask, ONE_DAY_MS);
  };

  runExpirationTask();

  console.log('[Scheduler] Form expiration task scheduled successfully.');
};
