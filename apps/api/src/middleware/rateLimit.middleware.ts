import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { RateLimitError } from '../common/errors/app-error';

export const generalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new RateLimitError('Too many requests from this IP, please try again later.'));
  },
  skip: () => process.env.NODE_ENV === 'test'
});

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: env.AUTH_RATE_LIMIT_MAX, // 10 attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new RateLimitError(
        'Too many authentication attempts from this IP, please try again in a minute.'
      )
    );
  },
  skip: () => process.env.NODE_ENV === 'test'
});
