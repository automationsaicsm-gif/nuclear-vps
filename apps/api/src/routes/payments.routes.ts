import { Router, Request } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { validateBody } from '../middleware/validate';
import { success, error } from '../utils/response';
import { sendOrderConfirmationEmail } from '../services/email.service';
import { logger } from '../utils/logger';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

const provisionVPS = async (invoiceId: string, planId: string, userId: string, location: string, os: string, billingCycle: string) => {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!plan || !user) return;

  const ipOctet1 = Math.floor(Math.random() * 200) + 50;
  const ipOctet2 = Math.floor(Math.random() * 255);
  const ipOctet3 = Math.floor(Math.random() * 255);
  const ipOctet4 = Math.floor(Math.random() * 254) + 1;
  const ipAddress = `${ipOctet1}.${ipOctet2}.${ipOctet3}.${ipOctet4}`;
  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

  const daysToAdd = billingCycle === 'ANNUALLY' ? 365 : billingCycle === 'QUARTERLY' ? 91 : 30;
  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + daysToAdd);

  const bcrypt = await import('bcrypt');
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const service = await prisma.service.create({
    data: {
      userId,
      planId,
      status: 'ACTIVE',
      billingCycle: billingCycle as 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY',
      location: location as 'LONDON' | 'NEW_YORK',
      os,
      ipAddress,
      hostname: `vps-${Date.now()}`,
      username: 'Administrator',
      passwordHash,
      nextDueDate,
    },
  });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { serviceId: service.id, status: 'PAID', paidAt: new Date() },
  });

  // Check if user was referred and credit affiliate
  const referral = await prisma.affiliateReferral.findUnique({ where: { referredId: userId } });
  if (referral) {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (invoice) {
      const commission = invoice.amount * 0.15;
      await prisma.affiliateReferral.update({
        where: { id: referral.id },
        data: { commission: { increment: commission }, status: 'pending' },
      });
    }
  }

  try {
    await sendOrderConfirmationEmail(user.email, user.firstName, {
      invoiceNumber: (await prisma.invoice.findUnique({ where: { id: invoiceId } }))!.invoiceNumber,
      planName: plan.name,
      amount: (await prisma.invoice.findUnique({ where: { id: invoiceId } }))!.amount,
      ipAddress,
      username: 'Administrator',
      password: tempPassword,
      location: location === 'LONDON' ? 'London, UK' : 'New York, US',
    });
  } catch (e) {
    logger.error('Failed to send order confirmation email:', e);
  }

  return service;
};

// POST /api/v1/payments/stripe/create-intent
router.post('/stripe/create-intent', authenticate, validateBody(
  z.object({ invoiceId: z.string(), planId: z.string(), location: z.string(), os: z.string(), billingCycle: z.string() })
), async (req: AuthRequest, res) => {
  const { invoiceId, planId, location, os, billingCycle } = req.body;
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.userId !== req.user!.id) return error(res, 'Invoice not found', 404);

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(invoice.amount * 100),
    currency: 'usd',
    metadata: { invoiceId, userId: req.user!.id, planId, location, os, billingCycle },
    automatic_payment_methods: { enabled: true },
  });

  return success(res, { clientSecret: intent.client_secret });
});

// POST /api/v1/payments/stripe/webhook
router.post('/stripe/webhook', async (req: Request, res) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    logger.error('Stripe webhook error:', err);
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const { invoiceId, userId, planId, location, os, billingCycle } = intent.metadata;
    await provisionVPS(invoiceId, planId, userId, location, os, billingCycle);
  }

  res.json({ received: true });
});

// POST /api/v1/payments/paypal/create-order
router.post('/paypal/create-order', authenticate, validateBody(
  z.object({ invoiceId: z.string(), planId: z.string(), location: z.string(), os: z.string(), billingCycle: z.string() })
), async (req: AuthRequest, res) => {
  const { invoiceId } = req.body;
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.userId !== req.user!.id) return error(res, 'Invoice not found', 404);

  // PayPal order creation stub
  return success(res, {
    orderId: `PAYPAL-${Date.now()}`,
    amount: invoice.amount,
    message: 'PayPal order created (configure PAYPAL_CLIENT_ID in .env)',
  });
});

// POST /api/v1/payments/paypal/capture/:orderId
router.post('/paypal/capture/:orderId', authenticate, async (req: AuthRequest, res) => {
  return success(res, { message: 'PayPal payment captured' });
});

// POST /api/v1/payments/coinbase/create-charge
router.post('/coinbase/create-charge', authenticate, validateBody(
  z.object({ invoiceId: z.string(), planId: z.string(), location: z.string(), os: z.string(), billingCycle: z.string() })
), async (req: AuthRequest, res) => {
  const { invoiceId } = req.body;
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.userId !== req.user!.id) return error(res, 'Invoice not found', 404);

  return success(res, {
    chargeId: `COINBASE-${Date.now()}`,
    amount: invoice.amount,
    message: 'Coinbase Commerce charge created (configure COINBASE_API_KEY in .env)',
  });
});

// POST /api/v1/payments/coinbase/webhook
router.post('/coinbase/webhook', async (req: Request, res) => {
  logger.info('Coinbase webhook received');
  res.json({ received: true });
});

// POST /api/v1/payments/add-credit
router.post('/add-credit', authenticate, validateBody(
  z.object({ amount: z.number().min(10).max(10000) })
), async (req: AuthRequest, res) => {
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { creditBalance: { increment: req.body.amount } },
  });
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { creditBalance: true } });
  return success(res, { creditBalance: user?.creditBalance });
});

export { provisionVPS };
export default router;
