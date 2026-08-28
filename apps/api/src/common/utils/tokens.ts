import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AuthenticationError } from '../errors/app-error';

export interface AccessTokenPayload {
  userId: string;
}

export function generateAccessToken(userId: string): string {
  // Payload contains only userId — no role or permissions in token
  return jwt.sign({ userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn']
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (!decoded || !decoded.userId) {
      throw new AuthenticationError('Invalid access token');
    }
    return decoded;
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Access token expired');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid access token');
    }
    throw new AuthenticationError('Authentication failed');
  }
}

export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(24).toString('hex');
}
