import { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/errors/app-error';
import { logger } from '../common/utils/logger';
import { ApiErrorResponse } from '@ems/shared-types';

export function errorMiddleware(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): Response<ApiErrorResponse> {
  const requestId = req.id || 'unknown-req';
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected internal server error occurred';
  let details: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'SyntaxError' && 'body' in err) {
    // Malformed JSON payload
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    message = 'Malformed JSON payload in request body';
  } else if (err.name === 'PrismaClientKnownRequestError') {
    // Handle specific Prisma database errors safely without leaking DB internals
    const prismaErr = err as { code?: string; meta?: Record<string, unknown> };
    if (prismaErr.code === 'P2002') {
      statusCode = 409;
      errorCode = 'UNIQUE_CONSTRAINT_VIOLATION';
      const target = (prismaErr.meta?.target as string[]) || ['Field'];
      message = `A record with this ${Array.isArray(target) ? target.join(', ') : 'value'} already exists`;
    } else if (prismaErr.code === 'P2025') {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = 'Requested record not found';
    } else if (prismaErr.code === 'P2003') {
      statusCode = 409;
      errorCode = 'FOREIGN_KEY_VIOLATION';
      message = 'Cannot perform operation due to existing foreign key relationships';
    }
  }

  // Log all 5xx or unexpected errors with full context
  if (statusCode >= 500) {
    logger.error('Unhandled Server Error', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      errorName: err.name,
      errorMessage: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  } else {
    logger.warn('Client/Operational Error', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode,
      errorCode,
      message
    });
  }

  const responseBody: ApiErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details !== undefined ? { details } : {})
    },
    requestId
  };

  return res.status(statusCode).json(responseBody);
}
