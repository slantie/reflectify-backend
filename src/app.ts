/**
 * @file src/app.ts
 * @description Configures and sets up the Express application.
 * Includes global middlewares, routes, and error handling.
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan'; // For logging HTTP requests
import AppError from './utils/appError';
import globalErrorHandler from './middlewares/error.middleware';
import apiV1Router from './api/v1/routes'; // Main API router for v1
import serviceRouter from './api/v1/routes/service/service.routes'; // Service-only routes

const app: Application = express();

// 1. Security Middlewares
app.use(helmet()); // Sets various HTTP headers for security

// 2. CORS - Cross-Origin Resource Sharing
// Configure CORS based on your frontend's origin in production
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? 'https://reflectify.live'
        : 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  })
);

// Check ENV
if (process.env.NODE_ENV !== 'production') {
  console.log('CORS enabled for all origins in development mode');
}

// 3. Body Parsers
app.use(express.json({ limit: '500kb' })); // Parses JSON request bodies
app.use(express.urlencoded({ extended: true, limit: '500kb' })); // Parses URL-encoded request bodies

// 4. Request Logger (Development only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Logs HTTP requests to console
}

// 5. API Routes
app.use('/api/v1', apiV1Router); // Mount the main API v1 router
app.use('/api/v1/service', serviceRouter); // Mount service-only routes (API key auth)

// 6. Health Check Route
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ message: "Backend API's running at /api/v1" });
});

// 7. Handle undefined routes (404 Not Found)
app.all('*', (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 8. Global Error Handling Middleware (MUST be the last middleware)
app.use(globalErrorHandler);

export default app;
