import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from root or apps/api directory
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .default('5001')
    .transform((val) => parseInt(val, 10)),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string({
    required_error: 'DATABASE_URL environment variable is required'
  }),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, 'JWT_ACCESS_SECRET must be at least 16 characters long')
    .default('dev-jwt-access-secret-change-in-production-min-32-chars-long'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters long')
    .default('dev-jwt-refresh-secret-change-in-production-min-32-chars-long'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z
    .string()
    .min(16, 'COOKIE_SECRET must be at least 16 characters long')
    .default('dev-cookie-secret-min-32-chars-long-secure-random'),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('900000')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10)),
  AUTH_RATE_LIMIT_MAX: z
    .string()
    .default('10')
    .transform((val) => parseInt(val, 10)),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z
    .string()
    .default('5')
    .transform((val) => parseInt(val, 10))
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsedEnv.data;
