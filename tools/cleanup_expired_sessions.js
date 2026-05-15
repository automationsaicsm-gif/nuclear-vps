/**
 * WAT Tool: cleanup_expired_sessions
 * Deletes expired sessions from the database and Redis.
 * Run as a cron job (see workflows/session_cleanup.md).
 * Usage: node tools/cleanup_expired_sessions.js
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { createLogger, transports, format } from 'winston';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

async function cleanupExpiredSessions() {
  logger.info('Starting session cleanup');

  // Delete expired sessions from DB
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  logger.info('DB sessions deleted', { count: result.count });

  // Delete expired password reset tokens
  const resetResult = await prisma.passwordReset.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { used: true }] },
  });

  logger.info('Password reset tokens cleaned', { count: resetResult.count });

  // Clean up Redis session keys (scan for dipgate:session:* keys)
  let cursor = '0';
  let redisDeleted = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'dipgate:session:*', 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      const pipeline = redis.pipeline();
      keys.forEach(k => pipeline.del(k));
      await pipeline.exec();
      redisDeleted += keys.length;
    }
  } while (cursor !== '0');

  logger.info('Redis session keys deleted', { count: redisDeleted });
  await redis.quit();

  return {
    success: true,
    dbSessionsDeleted: result.count,
    passwordResetsDeleted: resetResult.count,
    redisKeysDeleted: redisDeleted,
  };
}

cleanupExpiredSessions()
  .then(r => { console.log(JSON.stringify(r)); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());

export { cleanupExpiredSessions };
