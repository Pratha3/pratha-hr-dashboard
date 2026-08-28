import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime?: number;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.headers['x-request-id'] as string;
  const requestId = existingId || crypto.randomUUID();
  req.id = requestId;
  req.startTime = Date.now();
  res.setHeader('X-Request-Id', requestId);
  next();
}
