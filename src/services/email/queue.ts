// src/services/email/queue.ts

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import config from '../../config';

// Create a new Redis connection instance.
// BullMQ and ioredis will manage the connection state.
const connection = new IORedis(config.redisUrl || '', {
  maxRetriesPerRequest: null,
});

// Create a new Queue instance for handling emails.
// We're naming it 'email-queue' to identify it in Redis.
const emailQueue = new Queue('email-queue', {
  connection,
  defaultJobOptions: {
    attempts: 5, // Attempt to send an email 5 times before failing.
    backoff: {
      type: 'exponential', // Use exponential backoff strategy for retries.
      delay: 5000, // Wait 5 seconds before the first retry. The next will be 10s, then 20s, etc.
    },
    removeOnComplete: true, // Automatically remove jobs from the queue when they succeed.
    removeOnFail: false, // Keep failed jobs in the queue for inspection.
  },
});

console.log('Email Queue initialized.');

export { emailQueue, connection };
