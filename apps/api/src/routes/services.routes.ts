import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { validateBody } from '../middleware/validate';
import { success, error } from '../utils/response';

const router = Router();
router.use(authenticate);

const checkOwner = async (serviceId: string, userId: string, res: Parameters<typeof error>[0]) => {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) { error(res, 'Service not found', 404); return null; }
  if (service.userId !== userId) { error(res, 'Access denied', 403); return null; }
  return service;
};

// GET /api/v1/services
router.get('/', async (req: AuthRequest, res) => {
  const services = await prisma.service.findMany({
    where: { userId: req.user!.id },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });
  return success(res, services);
});

// GET /api/v1/services/:id
router.get('/:id', async (req: AuthRequest, res) => {
  const service = await prisma.service.findUnique({
    where: { id: req.params.id },
    include: { plan: true, backups: { orderBy: { createdAt: 'desc' }, take: 5 } },
  });
  if (!service) return error(res, 'Service not found', 404);
  if (service.userId !== req.user!.id && req.user!.role !== 'ADMIN')
    return error(res, 'Access denied', 403);
  return success(res, service);
});

// POST /api/v1/services/:id/start
router.post('/:id/start', async (req: AuthRequest, res) => {
  const svc = await checkOwner(req.params.id, req.user!.id, res);
  if (!svc) return;
  await prisma.service.update({ where: { id: svc.id }, data: { status: 'ACTIVE' } });
  return success(res, { message: 'Service started' });
});

// POST /api/v1/services/:id/stop
router.post('/:id/stop', async (req: AuthRequest, res) => {
  const svc = await checkOwner(req.params.id, req.user!.id, res);
  if (!svc) return;
  await prisma.service.update({ where: { id: svc.id }, data: { status: 'SUSPENDED' } });
  return success(res, { message: 'Service stopped' });
});

// POST /api/v1/services/:id/restart
router.post('/:id/restart', async (req: AuthRequest, res) => {
  const svc = await checkOwner(req.params.id, req.user!.id, res);
  if (!svc) return;
  return success(res, { message: 'Service restarting...' });
});

// POST /api/v1/services/:id/change-password
router.post(
  '/:id/change-password',
  validateBody(z.object({ password: z.string().min(8) })),
  async (req: AuthRequest, res) => {
    const svc = await checkOwner(req.params.id, req.user!.id, res);
    if (!svc) return;
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    await prisma.service.update({ where: { id: svc.id }, data: { passwordHash } });
    return success(res, { message: 'Password changed' });
  }
);

// POST /api/v1/services/:id/reinstall
router.post(
  '/:id/reinstall',
  validateBody(z.object({ os: z.string(), password: z.string().min(8) })),
  async (req: AuthRequest, res) => {
    const svc = await checkOwner(req.params.id, req.user!.id, res);
    if (!svc) return;
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    await prisma.service.update({
      where: { id: svc.id },
      data: { os: req.body.os, passwordHash, status: 'PENDING' },
    });
    setTimeout(async () => {
      await prisma.service.update({ where: { id: svc.id }, data: { status: 'ACTIVE' } });
    }, 3000);
    return success(res, { message: 'Reinstalling OS...' });
  }
);

// POST /api/v1/services/:id/cancel
router.post('/:id/cancel', async (req: AuthRequest, res) => {
  const svc = await checkOwner(req.params.id, req.user!.id, res);
  if (!svc) return;
  await prisma.service.update({ where: { id: svc.id }, data: { status: 'CANCELLED' } });
  return success(res, { message: 'Service cancellation requested' });
});

// GET /api/v1/services/:id/backups
router.get('/:id/backups', async (req: AuthRequest, res) => {
  const svc = await checkOwner(req.params.id, req.user!.id, res);
  if (!svc) return;
  const backups = await prisma.backup.findMany({
    where: { serviceId: svc.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  return success(res, backups);
});

// POST /api/v1/services/:id/backups/:backupId/restore
router.post('/:id/backups/:backupId/restore', async (req: AuthRequest, res) => {
  const svc = await checkOwner(req.params.id, req.user!.id, res);
  if (!svc) return;
  const backup = await prisma.backup.findUnique({ where: { id: req.params.backupId } });
  if (!backup || backup.serviceId !== svc.id) return error(res, 'Backup not found', 404);
  return success(res, { message: 'Restore initiated. This may take a few minutes.' });
});

export default router;
