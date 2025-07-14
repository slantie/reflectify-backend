// api/index.ts
import app from '../app';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { setupScheduledTasks } from '../utils/scheduler';

setupScheduledTasks(); // Optional, runs once per cold start

export default function handler(req: VercelRequest, res: VercelResponse) {
  app(req as any, res as any); // Forward request to Express
}
