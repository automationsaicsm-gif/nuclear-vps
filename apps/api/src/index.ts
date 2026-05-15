import 'dotenv/config';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { logger } from './utils/logger';
import app from './app';

const PORT = parseInt(process.env.PORT || '4000');

// In serverless (Vercel), just export the app — no listen needed
if (process.env.VERCEL) {
  module.exports = app;
} else {
  const start = async () => {
    try {
      await prisma.$connect();
      logger.info('Database connected');

      try {
        await redis.ping();
        logger.info('Redis connected');
      } catch {
        logger.warn('Redis unavailable — sessions will not be cached.');
      }

      app.listen(PORT, () => {
        logger.info(`API server running on http://localhost:${PORT}`);
      });
    } catch (err) {
      logger.error('Failed to start server:', err);
      process.exit(1);
    }
  };

  start();
}

export default app;
