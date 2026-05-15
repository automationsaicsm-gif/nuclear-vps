import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { success, error } from '../utils/response';

const router = Router();

// GET /api/v1/plans
router.get('/', async (_req, res) => {
  const plans = await prisma.plan.findMany({
    where: { available: true },
    orderBy: { sortOrder: 'asc' },
  });
  return success(res, plans);
});

// GET /api/v1/plans/:slug
router.get('/:slug', async (req, res) => {
  const plan = await prisma.plan.findUnique({ where: { slug: req.params.slug } });
  if (!plan) return error(res, 'Plan not found', 404);
  return success(res, plan);
});

export default router;
