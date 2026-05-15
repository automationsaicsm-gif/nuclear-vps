import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { validateBody } from '../middleware/validate';
import { success, error } from '../utils/response';

const router = Router();
router.use(authenticate);

// GET /api/v1/affiliate/stats
router.get('/stats', async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { affiliateCode: true, affiliateCoupon: true, creditBalance: true },
  });

  const referrals = await prisma.affiliateReferral.findMany({
    where: { referrerId: req.user!.id },
  });

  const totalCommission = referrals.reduce((sum, r) => sum + r.commission, 0);
  const conversions = referrals.length;

  return success(res, {
    affiliateCode: user?.affiliateCode,
    affiliateCoupon: user?.affiliateCoupon,
    totalCommission,
    conversions,
    affiliateUrl: `${process.env.WEB_URL}?ref=${user?.affiliateCode}`,
  });
});

// GET /api/v1/affiliate/referrals
router.get('/referrals', async (req: AuthRequest, res) => {
  const referrals = await prisma.affiliateReferral.findMany({
    where: { referrerId: req.user!.id },
    include: {
      referred: {
        select: { email: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const masked = referrals.map((r) => ({
    ...r,
    referred: {
      email: r.referred.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
      createdAt: r.referred.createdAt,
    },
  }));

  return success(res, masked);
});

// POST /api/v1/affiliate/withdraw
router.post(
  '/withdraw',
  validateBody(z.object({ amount: z.number().min(10), paypalEmail: z.string().email() })),
  async (req: AuthRequest, res) => {
    const referrals = await prisma.affiliateReferral.findMany({
      where: { referrerId: req.user!.id, status: 'pending' },
    });
    const available = referrals.reduce((sum, r) => sum + r.commission, 0);

    if (req.body.amount > available)
      return error(res, `Insufficient balance. Available: $${available.toFixed(2)}`, 400);

    await prisma.affiliateWithdrawal.create({
      data: { userId: req.user!.id, amount: req.body.amount },
    });

    return success(res, { message: 'Withdrawal request submitted. Admin will process within 3 business days.' });
  }
);

export default router;
