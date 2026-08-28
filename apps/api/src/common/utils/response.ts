import { Response } from 'express';
import { ApiResponse, ApiResponseMeta } from '@ems/shared-types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiResponseMeta
): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {})
  };
  return res.status(statusCode).json(body);
}

// Ensure passwordHash is NEVER serialized in any user object returned from API
export function sanitizeUser<T extends { passwordHash?: string | null }>(
  user: T
): Omit<T, 'passwordHash'> {
  const { passwordHash: _hash, ...safe } = user;
  return safe;
}
