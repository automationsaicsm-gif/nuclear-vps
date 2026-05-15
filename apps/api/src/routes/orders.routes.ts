import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { validateBody } from '../middleware/validate';
import { success, error } from '../utils/response';

const router = Router();
router.use(authenticate);

const createOrderSchema = z.object({
  planId: z.string(),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUALLY']),
  location: z.enum(['LONDON', 'NEW_YORK']),
  os: z.string().default('Windows 2022'),
  couponCode: z.string().optional(),
  useCredit: z.boolean().default(false),
});

const applyCouponSchema = z.object({ code: z.string() });

const calcPrice = (plan: { monthlyPrice: number; quarterlyPrice: number; annualPrice: number }, cycle: string) => {
  switch (cycle) {
    case 'QUARTERLY': return plan.quarterlyPrice;
    case 'ANNUALLY': return plan.annualPrice;
    default: return plan.monthlyPrice;
  }
};

const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count();
  return `INV-${year}-${String(count + 1).padStart(6, '0')}`;
};

// POST /api/v1/orders/create
router.post('/create', validateBody(createOrderSchema), async (req: AuthRequest, res) => {
  const { planId, billingCycle, location, os, couponCode, useCredit } = req.body;

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.available) return error(res, 'Plan not found or unavailable', 404);

  let amount = calcPrice(plan, billingCycle);
  let discountAmount = 0;
  let coupon = null;

  if (couponCode) {
    coupon = await prisma.couponCode.findUnique({
      where: { code: couponCode.toUpperCase() },
    });
    if (
      !coupon ||
      !coupon.active ||
      (coupon.expiresAt && coupon.expiresAt < new Date()) ||
      (coupon.maxUses && coupon.uses >= coupon.maxUses)
    ) {
      return error(res, 'Invalid or expired coupon code', 400);
    }
    discountAmount = amount * (coupon.discount / 100);
    amount = amount - discountAmount;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  let creditUsed = 0;
  if (useCredit && user && user.creditBalance > 0) {
    creditUsed = Math.min(user.creditBalance, amount);
    amount = amount - creditUsed;
  }

  const invoiceNumber = await generateInvoiceNumber();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      userId: req.user!.id,
      amount,
      dueDate,
      items: {
        create: [
          {
            description: `${plan.name} - ${billingCycle.charAt(0) + billingCycle.slice(1).toLowerCase()} Subscription`,
            amount: calcPrice(plan, billingCycle),
            quantity: 1,
          },
          ...(discountAmount > 0
            ? [{ description: `Coupon Discount (${coupon?.code})`, amount: -discountAmount, quantity: 1 }]
            : []),
          ...(creditUsed > 0
            ? [{ description: 'Account Credit Applied', amount: -creditUsed, quantity: 1 }]
            : []),
        ],
      },
    },
  });

  if (coupon) {
    await prisma.couponCode.update({ where: { id: coupon.id }, data: { uses: { increment: 1 } } });
  }
  if (creditUsed > 0 && user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { creditBalance: { decrement: creditUsed } },
    });
  }

  return success(res, {
    invoiceId: invoice.id,
    invoiceNumber,
    amount,
    planId,
    billingCycle,
    location,
    os,
  }, 201);
});

// POST /api/v1/orders/apply-coupon
router.post('/apply-coupon', validateBody(applyCouponSchema), async (req: AuthRequest, res) => {
  const coupon = await prisma.couponCode.findUnique({
    where: { code: req.body.code.toUpperCase() },
  });

  if (
    !coupon ||
    !coupon.active ||
    (coupon.expiresAt && coupon.expiresAt < new Date()) ||
    (coupon.maxUses && coupon.uses >= coupon.maxUses)
  ) {
    return error(res, 'Invalid or expired coupon code', 400);
  }

  return success(res, { discount: coupon.discount, code: coupon.code });
});

export default router;
