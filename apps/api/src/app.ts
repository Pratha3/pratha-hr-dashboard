import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { prisma } from './config/database';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { generalRateLimiter } from './middleware/rateLimit.middleware';
import { csrfMiddleware } from './middleware/csrf.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { apiRouter } from './routes';
import { logger } from './common/utils/logger';
import { NotFoundError } from './common/errors/app-error';

export function createApp(): Express {
  const app = express();

  // Trust proxy for secure cookies / rate limiters behind reverse proxies
  app.set('trust proxy', 1);

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        if (
          !origin ||
          origin === env.CORS_ORIGIN ||
          origin.endsWith('.vercel.app') ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1')
        ) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-Id',
        'x-csrf-token',
        'x-xsrf-token'
      ],
      exposedHeaders: ['X-Request-Id', 'x-csrf-token']
    })
  );

  // Body and Cookie Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // Request ID Assignment
  app.use(requestIdMiddleware);

  // Request Logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      const duration = req.startTime ? Date.now() - req.startTime : 0;
      logger.info('HTTP Request', {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip
      });
    });
    next();
  });

  // Health Check Endpoint
  app.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Check database connectivity
      await prisma.$queryRaw`SELECT 1`;

      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        database: 'connected'
      });
    } catch (err) {
      next(err);
    }
  });

  // Apply General Rate Limiter
  app.use(generalRateLimiter);

  // Apply CSRF Protection (double-submit cookie on mutating requests)
  app.use(csrfMiddleware);

  // Mount API v1 Routes
  app.use('/api/v1', apiRouter);

  // 404 Handler
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
  });

  // Global Error Handler
  app.use(errorMiddleware);

  return app;
}
