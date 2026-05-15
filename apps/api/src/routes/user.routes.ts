import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { validateBody } from '../middleware/validate';
import { success, error } from '../utils/response';

const router = Router();
router.use(authenticate);

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

// GET /api/v1/user/profile
router.get('/profile', async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, firstName: true, lastName: true, email: true,
      phone: true, company: true, country: true, address: true,
      role: true, creditBalance: true, affiliateCode: true,
      emailVerified: true, twoFactorEnabled: true, createdAt: true,
    },
  });
  return success(res, user);
});

// PUT /api/v1/user/profile
router.put('/profile', validateBody(updateProfileSchema), async (req: AuthRequest, res) => {
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: req.body,
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true, country: true, address: true },
  });
  return success(res, user);
});

// PUT /api/v1/user/change-password
router.put('/change-password', validateBody(changePasswordSchema), async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return error(res, 'User not found', 404);

  const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
  if (!valid) return error(res, 'Current password is incorrect', 400);

  const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  await prisma.user.update({ where: { id: req.user!.id }, data: { passwordHash } });
  return success(res, { message: 'Password changed successfully' });
});

// PUT /api/v1/user/notifications
router.put('/notifications', async (req: AuthRequest, res) => {
  return success(res, { message: 'Notification preferences saved' });
});

// GET /api/v1/user/sessions
router.get('/sessions', async (req: AuthRequest, res) => {
  const sessions = await prisma.session.findMany({
    where: { userId: req.user!.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  return success(res, sessions.map((s) => ({ id: s.id, createdAt: s.createdAt, expiresAt: s.expiresAt })));
});

// DELETE /api/v1/user/sessions/:sessionId
router.delete('/sessions/:sessionId', async (req: AuthRequest, res) => {
  const session = await prisma.session.findUnique({ where: { id: req.params.sessionId } });
  if (!session || session.userId !== req.user!.id) return error(res, 'Session not found', 404);
  await prisma.session.delete({ where: { id: session.id } });
  return success(res, { message: 'Session revoked' });
});

// DELETE /api/v1/user/account
router.delete('/account', validateBody(deleteAccountSchema), async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return error(res, 'User not found', 404);

  const valid = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!valid) return error(res, 'Password incorrect', 400);

  const activeServices = await prisma.service.count({
    where: { userId: req.user!.id, status: 'ACTIVE' },
  });
  if (activeServices > 0)
    return error(res, 'Please cancel all active services before deleting your account', 400);

  await prisma.user.delete({ where: { id: req.user!.id } });
  return success(res, { message: 'Account deleted successfully' });
});

// GET /api/v1/user/notifications
router.get('/notifications', async (req: AuthRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return success(res, notifications);
});

// PUT /api/v1/user/notifications/:id/read
router.put('/notifications/:id/read', async (req: AuthRequest, res) => {
  const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notif || notif.userId !== req.user!.id) return error(res, 'Notification not found', 404);
  await prisma.notification.update({ where: { id: notif.id }, data: { read: true } });
  return success(res, { message: 'Notification marked as read' });
});

export default router;
