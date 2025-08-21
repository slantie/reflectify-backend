/**
 * @file src/app.ts
 * @description Configures and sets up the Express application with global middlewares, routes, and error handling.
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import './services/email/worker';
import AppError from './utils/appError';
import apiV1Router from './api/v1/routes';
import serviceRouter from './api/v1/routes/service/service.routes';

const app: Application = express();

// Apply security middlewares.
app.use(helmet());

// Configure Cross-Origin Resource Sharing (CORS).
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_PROD_URL
        : process.env.FRONTEND_DEV_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  })
);

// Configure body parsers for JSON and URL-encoded data.
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));

// Enable request logging in development environment.
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Mount API routes for version 1.
app.use('/api/v1', apiV1Router);
app.use('/api/v1/service', serviceRouter);

// Define a health check endpoint.
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ message: "Backend API's running at /api/v1" });
});

// Handle undefined routes (404 Not Found).
app.all('*', (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

export default app;
