import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { validateBody } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiter';
import { success, error } from '../utils/response';
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from '../services/email.service';

const router = Router();

const registerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  country: z.string().default('US'),
  phone: z.string().optional(),
  company: z.string().optional(),
  acceptTerms: z.boolean().refine((v) => v === true, 'You must accept the terms'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(100),
});

const generateAffiliateCode = async (): Promise<string> => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let unique = false;
  while (!unique) {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const existing = await prisma.user.findUnique({ where: { affiliateCode: code } });
    if (!existing) unique = true;
  }
  return code;
};

const signToken = (userId: string, sessionToken?: string) => {
  return jwt.sign(
    { userId, sessionToken },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// POST /api/v1/auth/register
router.post('/register', authLimiter, validateBody(registerSchema), async (req, res) => {
  const { firstName, lastName, email, password, country, phone, company } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return error(res, 'Email already in use', 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const affiliateCode = await generateAffiliateCode();

  const user = await prisma.user.create({
    data: { firstName, lastName, email, passwordHash, country, phone, company, affiliateCode },
  });

  const sessionToken = crypto.randomUUID();
  const token = signToken(user.id, sessionToken);

  try { await redis.setex(`session:${sessionToken}`, 7 * 24 * 60 * 60, user.id); } catch {}

  res.cookie('token', token, cookieOptions);

  try {
    await sendWelcomeEmail(email, firstName);
  } catch {}

  return success(res, {
    user: { id: user.id, firstName, lastName, email, role: user.role },
    token,
  }, 201);
});

// POST /api/v1/auth/login
router.post('/login', authLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return error(res, 'Invalid email or password', 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return error(res, 'Invalid email or password', 401);

  const sessionToken = crypto.randomUUID();
  const token = signToken(user.id, sessionToken);

  await prisma.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  try { await redis.setex(`session:${sessionToken}`, 7 * 24 * 60 * 60, user.id); } catch {}

  res.cookie('token', token, cookieOptions);

  return success(res, {
    user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
    token,
  });
});

// POST /api/v1/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  const token = req.cookies?.token || req.headers.authorization?.slice(7);
  if (token) {
    try {
      const decoded = jwt.decode(token) as { sessionToken?: string };
      if (decoded?.sessionToken) {
        await redis.setex(`blacklist:${decoded.sessionToken}`, 7 * 24 * 60 * 60, '1');
        await redis.del(`session:${decoded.sessionToken}`);
        await prisma.session.deleteMany({ where: { token: decoded.sessionToken } });
      }
    } catch {}
  }
  res.clearCookie('token');
  return success(res, { message: 'Logged out successfully' });
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      creditBalance: true,
      affiliateCode: true,
      country: true,
      phone: true,
      company: true,
      address: true,
      emailVerified: true,
      twoFactorEnabled: true,
      createdAt: true,
    },
  });
  return success(res, user);
});

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to avoid email enumeration
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    try {
      await sendPasswordResetEmail(email, user.firstName, token);
    } catch {}
  }

  return success(res, { message: 'If that email exists, a reset link has been sent.' });
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), async (req, res) => {
  const { token, password } = req.body;

  const reset = await prisma.passwordReset.findUnique({ where: { token } });
  if (!reset || reset.used || reset.expiresAt < new Date())
    return error(res, 'Invalid or expired reset token', 400);

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } });
  await prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } });

  return success(res, { message: 'Password reset successfully' });
});

export default router;
