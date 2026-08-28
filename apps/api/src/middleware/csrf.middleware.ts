import { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/errors/app-error';
import { generateCsrfToken } from '../common/utils/tokens';
import { env } from '../config/env';

export const CSRF_COOKIE_NAME = 'x-csrf-token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Ensure CSRF token cookie exists
  let csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];
  if (!csrfCookie) {
    csrfCookie = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, csrfCookie, {
      httpOnly: false, // Must be readable by client JS to send in custom header
      secure: env.COOKIE_SECURE,
      sameSite: 'lax',
      path: '/'
    });
  }

  // Safe HTTP methods do not require CSRF validation
  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  // Allow test bypass only if specifically configured
  if (process.env.DISABLE_CSRF_CHECK === 'true') {
    return next();
  }

  // Check double-submit cookie for mutating requests
  const headerToken = (req.headers[CSRF_HEADER_NAME] || req.headers['x-xsrf-token']) as string;

  if (!headerToken || !csrfCookie || headerToken !== csrfCookie) {
    return next(
      new AppError('Invalid or missing CSRF token', 403, 'CSRF_VALIDATION_FAILED')
    );
  }

  next();
}
