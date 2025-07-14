import app from '../app';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { setupScheduledTasks } from '../utils/scheduler';

setupScheduledTasks(); // optional

export default function handler(req: VercelRequest, res: VercelResponse) {
  app(req as any, res as any);
}
