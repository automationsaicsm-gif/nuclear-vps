import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { generalLimiter } from './middleware/rateLimiter';

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

app.use(helmet({ crossOriginResourcePolicy: false }));
const allowedOrigins = (process.env.WEB_URL || 'http://localhost:3000').split(',').map(o => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin.endsWith('.vercel.app') || allowedOrigins.some(o => origin.startsWith(o))) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
  })
);

app.use('/api/v1/payments/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(generalLimiter);

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

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((_req, res) => res.status(404).json({ success: false, error: 'Route not found' }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ success: false, error: 'Internal server error' });
});

export default app;
