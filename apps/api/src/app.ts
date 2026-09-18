import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { prisma, checkDatabaseHealth } from './config/database';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { generalRateLimiter } from './middleware/rateLimit.middleware';
import { csrfMiddleware } from './middleware/csrf.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { apiRouter } from './routes';
import { logger } from './common/utils/logger';
import { NotFoundError } from './common/errors/app-error';
import { notificationEmitter } from './modules/notifications/notification.emitter';

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
          callback(new Error('Blocked by CORS policy'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-Id',
        'x-csrf-token',
        'x-xsrf-token',
        'x-organization-id'
      ],
      exposedHeaders: ['X-Request-Id', 'x-csrf-token', 'x-organization-id']
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

  // =========================================================================
  // Production Health & Readiness Probes
  // =========================================================================

  // 1. Lightweight Liveness Probe (for container orchestrators / load balancer ping)
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV
    });
  });

  // 2. Deep Readiness Probe (Verifies Database Latency, Memory Usage, and System Metrics)
  app.get('/health/ready', async (_req: Request, res: Response) => {
    const dbHealth = await checkDatabaseHealth();
    const memory = process.memoryUsage();
    const isHealthy = dbHealth.status === 'healthy';

    const payload = {
      status: isHealthy ? 'ready' : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbHealth.status,
        latencyMs: dbHealth.latencyMs,
        error: dbHealth.error
      },
      system: {
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
        activeSseConnections: notificationEmitter.getActiveSubscriberCount()
      }
    };

    if (!isHealthy) {
      res.status(503).json(payload);
      return;
    }

    res.status(200).json(payload);
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
