import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { logger } from './common/utils/logger';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 EMS Backend Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  console.log(`\n===============================================================`);
  console.log(`🚀 EMS Backend API is live at: http://localhost:${env.PORT}`);
  console.log(`📡 Health Check:              http://localhost:${env.PORT}/health`);
  console.log(`🔐 Auth Endpoints:            http://localhost:${env.PORT}/api/v1/auth`);
  console.log(`===============================================================\n`);
});

// Graceful shutdown handling
async function shutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('Database connection closed.');
    process.exit(0);
  });

  // Force shutdown after 10s if dangling connections exist
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
