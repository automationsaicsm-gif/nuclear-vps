import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { generalLimiter } from './middleware/rateLimiter';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { logger } from './utils/logger';

import authRoutes from './routes/auth.routes';
import plansRoutes from './routes/plans.routes';
import servicesRoutes from './routes/services.routes';
import ordersRoutes from './routes/orders.routes';
import paymentsRoutes from './routes/payments.routes';
import invoicesRoutes from './routes/invoices.routes';
import ticketsRoutes from './routes/tickets.routes';
import affiliateRoutes from './routes/affiliate.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import contentRoutes from './routes/content.routes';

const app = express();
const PORT = parseInt(process.env.PORT || '4000');

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Stripe webhook needs raw body
app.use('/api/v1/payments/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(generalLimiter);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/plans', plansRoutes);
app.use('/api/v1/services', servicesRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/invoices', invoicesRoutes);
app.use('/api/v1/tickets', ticketsRoutes);
app.use('/api/v1/affiliate', affiliateRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', contentRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 handler
app.use((_req, res) => res.status(404).json({ success: false, error: 'Route not found' }));

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const start = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    // Redis is optional in development
    try {
      await redis.ping();
      logger.info('Redis connected');
    } catch (redisErr) {
      logger.warn('Redis unavailable — sessions will not be cached. Start Redis for full functionality.');
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

export default app;
