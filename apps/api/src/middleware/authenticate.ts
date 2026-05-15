import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { error } from '../utils/response';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) return error(res, 'Authentication required', 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      sessionToken?: string;
    };

    // Check Redis session blacklist (skip if Redis unavailable)
    if (decoded.sessionToken) {
      try {
        const blacklisted = await redis.get(`blacklist:${decoded.sessionToken}`);
        if (blacklisted) return error(res, 'Session expired', 401);
      } catch {}
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, firstName: true, lastName: true },
    });

    if (!user) return error(res, 'User not found', 401);

    req.user = user;
    next();
  } catch {
    return error(res, 'Invalid token', 401);
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') return error(res, 'Admin access required', 403);
  next();
};

export const requireSupport = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!['ADMIN', 'SUPPORT'].includes(req.user?.role || ''))
    return error(res, 'Support access required', 403);
  next();
};
