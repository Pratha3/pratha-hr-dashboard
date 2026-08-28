import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from '../common/errors/app-error';
import { generateCsrfToken } from '../common/utils/tokens';
import { env } from '../config/env';

export const CSRF_COOKIE_NAME = 'x-csrf-token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function safeCompare(a: string, b: string): boolean {
  if (!a || !b || typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existingCookie = req.cookies?.[CSRF_COOKIE_NAME];
  let csrfCookie = existingCookie;

  // Ensure CSRF token cookie is set on the response if not already present
  if (!csrfCookie) {
    csrfCookie = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, csrfCookie, {
      httpOnly: false, // Must be readable by client JS to send in custom header
      secure: env.COOKIE_SECURE,
      sameSite: 'lax',
      path: '/'
    });
  }

  // Safe HTTP methods (GET, HEAD, OPTIONS) do not mutate state
  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  // Allow test bypass only if specifically configured
  if (process.env.DISABLE_CSRF_CHECK === 'true') {
    return next();
  }

  const headerToken = (req.headers[CSRF_HEADER_NAME] || req.headers['x-xsrf-token']) as string;

  // If a CSRF cookie was sent with the request, the custom header MUST match it in constant time
  if (existingCookie) {
    if (!headerToken || !safeCompare(headerToken, existingCookie)) {
      return next(
        new AppError('Invalid or missing CSRF token', 403, 'CSRF_VALIDATION_FAILED')
      );
    }
  }

  next();
}

