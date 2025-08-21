// src/services/email/worker.ts

import { Worker } from 'bullmq';
import { connection } from './queue';
import { emailService } from './email.service';

// The interface for the data our email jobs will contain.
interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

// Define the worker.
// The first argument is the queue name, which MUST match the queue we created earlier.
// The second argument is the "processor" function that runs for each job.
const emailWorker = new Worker<EmailJobData>(
  'email-queue',
  async (job) => {
    console.log(`Processing job ${job.id} for: ${job.data.to}`);
    // Call our email service to do the actual sending.
    await emailService.sendTransactionalEmail(job.data);
  },
  {
    connection,
    // We can control how many jobs are processed at once.
    // Setting concurrency to 1 ensures emails are sent one-by-one.
    concurrency: 1,
    limiter: {
      // Do not process more than 1 job every 4 seconds to be extra safe with rate limits.
      max: 1,
      duration: 4000,
    },
  }
);

// --- Worker Event Listeners for Logging ---

emailWorker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed for: ${job.data.to}`);
});

emailWorker.on('failed', (job, err) => {
  console.error(
    `Job ${job!.id} has failed for: ${job!.data.to} with error: ${err.message}`
  );
});

console.log('Email Worker initialized and listening for jobs.');

export { emailWorker };
