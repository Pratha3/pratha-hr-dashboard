import { PrismaClient } from '@prisma/client';
import { logger } from '../common/utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const isDev = process.env.NODE_ENV === 'development';
  const client = new PrismaClient({
    log: isDev
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' }
        ]
      : [{ emit: 'stdout', level: 'error' }]
  });

  // In development, log queries exceeding 500ms threshold
  if (isDev) {
    (client as any).$on('query', (e: any) => {
      if (e.duration >= 500) {
        logger.warn(`🐢 [SLOW QUERY] Duration: ${e.duration}ms | Query: ${e.query}`);
      }
    });
  }

  return client;
}

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * Diagnostic utility to check database connectivity and query latency.
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return {
      status: 'healthy',
      latencyMs
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return {
      status: 'unhealthy',
      latencyMs,
      error: err.message || 'Database connection error'
    };
  }
}
