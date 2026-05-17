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
  if (!process.env.STRIPE_SECRET_KEY) {
    return error(res, 'Payment processing not configured. Please contact support.', 503);
  }

  const { invoiceId, planId, location, os, billingCycle } = req.body;
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.userId !== req.user!.id) return error(res, 'Invoice not found', 404);

  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(invoice.amount * 100),
      currency: 'usd',
      metadata: { invoiceId, userId: req.user!.id, planId, location, os, billingCycle },
      automatic_payment_methods: { enabled: true },
    });
    return success(res, { clientSecret: intent.client_secret });
  } catch (e: unknown) {
    logger.error('Stripe error:', e);
    return error(res, 'Payment provider error. Please try again or contact support.', 502);
  }
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

// ─── PayPal helpers ──────────────────────────────────────────────────────────

const paypalBase = () =>
  process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const getPayPalAccessToken = async (): Promise<string> => {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json() as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`PayPal auth failed: ${data.error}`);
  return data.access_token;
};

// POST /api/v1/payments/paypal/create-order
router.post('/paypal/create-order', authenticate, validateBody(
  z.object({ invoiceId: z.string(), planId: z.string(), location: z.string(), os: z.string(), billingCycle: z.string() })
), async (req: AuthRequest, res) => {
  if (!process.env.PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID === '...') {
    return error(res, 'PayPal payments not configured. Please contact support.', 503);
  }

  const { invoiceId, planId, location, os, billingCycle } = req.body;
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.userId !== req.user!.id) return error(res, 'Invoice not found', 404);

  try {
    const accessToken = await getPayPalAccessToken();
    const webUrl = (process.env.WEB_URL || 'https://nuclear-vps-web.vercel.app').replace(/\/$/, '');

    const customId = JSON.stringify({ invoiceId, planId, userId: req.user!.id, location, os, billingCycle });

    const orderRes = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: invoice.amount.toFixed(2) },
          description: `Nuclear VPS — Invoice ${invoice.invoiceNumber}`,
          custom_id: customId.substring(0, 127),
        }],
        application_context: {
          return_url: `${webUrl}/dashboard/order?paypal=success`,
          cancel_url: `${webUrl}/dashboard/order?paypal=cancel`,
          brand_name: 'Nuclear VPS',
          user_action: 'PAY_NOW',
        },
      }),
    });

    const order = await orderRes.json() as {
      id?: string;
      links?: { rel: string; href: string }[];
      message?: string;
    };

    if (!order.id) {
      logger.error('PayPal create order failed:', order);
      return error(res, 'Failed to create PayPal order. Please try again.', 502);
    }

    const approvalLink = order.links?.find(l => l.rel === 'approve');
    await prisma.invoice.update({ where: { id: invoiceId }, data: { paypalId: order.id } });

    return success(res, { orderId: order.id, approvalUrl: approvalLink?.href });
  } catch (e) {
    logger.error('PayPal create-order error:', e);
    return error(res, 'PayPal payment error. Please try again or contact support.', 502);
  }
});

// POST /api/v1/payments/paypal/capture/:orderId
router.post('/paypal/capture/:orderId', authenticate, async (req: AuthRequest, res) => {
  if (!process.env.PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID === '...') {
    return error(res, 'PayPal payments not configured.', 503);
  }

  try {
    const accessToken = await getPayPalAccessToken();

    const captureRes = await fetch(
      `${paypalBase()}/v2/checkout/orders/${req.params.orderId}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const capture = await captureRes.json() as {
      status?: string;
      purchase_units?: { custom_id?: string; payments?: { captures?: { id: string }[] } }[];
      message?: string;
    };

    if (capture.status !== 'COMPLETED') {
      logger.error('PayPal capture failed:', capture);
      return error(res, 'PayPal payment was not completed. Please try again.', 402);
    }

    // Parse custom_id to get order details for provisioning
    const rawCustomId = capture.purchase_units?.[0]?.custom_id || '';
    try {
      const { invoiceId, planId, userId, location, os, billingCycle } = JSON.parse(rawCustomId);
      const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id;
      if (captureId) {
        await prisma.invoice.update({ where: { id: invoiceId }, data: { paypalId: captureId } });
      }
      await provisionVPS(invoiceId, planId, userId, location, os, billingCycle);
    } catch {
      logger.error('PayPal capture: failed to parse custom_id or provision VPS', rawCustomId);
    }

    return success(res, { status: 'COMPLETED' });
  } catch (e) {
    logger.error('PayPal capture error:', e);
    return error(res, 'PayPal capture failed. Please contact support.', 502);
  }
});

// ─── Coinbase Commerce helpers ────────────────────────────────────────────────

// POST /api/v1/payments/coinbase/create-charge
router.post('/coinbase/create-charge', authenticate, validateBody(
  z.object({ invoiceId: z.string(), planId: z.string(), location: z.string(), os: z.string(), billingCycle: z.string() })
), async (req: AuthRequest, res) => {
  if (!process.env.COINBASE_API_KEY || process.env.COINBASE_API_KEY === '...') {
    return error(res, 'Crypto payments not configured. Please contact support.', 503);
  }

  const { invoiceId, planId, location, os, billingCycle } = req.body;
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.userId !== req.user!.id) return error(res, 'Invoice not found', 404);

  try {
    const webUrl = (process.env.WEB_URL || 'https://nuclear-vps-web.vercel.app').replace(/\/$/, '');

    const chargeRes = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'X-CC-Api-Key': process.env.COINBASE_API_KEY,
        'X-CC-Version': '2018-03-22',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Nuclear VPS',
        description: `Invoice ${invoice.invoiceNumber}`,
        pricing_type: 'fixed_price',
        local_price: { amount: invoice.amount.toFixed(2), currency: 'USD' },
        metadata: {
          invoiceId,
          planId,
          userId: req.user!.id,
          location,
          os,
          billingCycle,
        },
        redirect_url: `${webUrl}/dashboard/order?crypto=success`,
        cancel_url: `${webUrl}/dashboard/order?crypto=cancel`,
      }),
    });

    const charge = await chargeRes.json() as {
      data?: { id: string; hosted_url: string; code: string };
      error?: { message: string };
    };

    if (!charge.data?.id) {
      logger.error('Coinbase create charge failed:', charge);
      return error(res, 'Failed to create crypto charge. Please try again.', 502);
    }

    await prisma.invoice.update({ where: { id: invoiceId }, data: { coinbaseId: charge.data.code } });

    return success(res, {
      chargeId: charge.data.id,
      chargeCode: charge.data.code,
      hostedUrl: charge.data.hosted_url,
    });
  } catch (e) {
    logger.error('Coinbase create-charge error:', e);
    return error(res, 'Crypto payment error. Please try again or contact support.', 502);
  }
});

// POST /api/v1/payments/coinbase/webhook
router.post('/coinbase/webhook', async (req: Request, res) => {
  const signature = req.headers['x-cc-webhook-signature'] as string;
  const webhookSecret = process.env.COINBASE_WEBHOOK_SECRET;

  if (!webhookSecret || webhookSecret === '...') {
    logger.warn('Coinbase webhook received but COINBASE_WEBHOOK_SECRET not set');
    return res.json({ received: true });
  }

  try {
    // Verify signature using HMAC SHA-256
    const crypto = await import('crypto');
    const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSig) {
      logger.warn('Coinbase webhook: invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(rawBody) as {
      event: { type: string; data: { metadata?: Record<string, string>; code?: string } };
    };

    if (event.event.type === 'charge:confirmed') {
      const { invoiceId, planId, userId, location, os, billingCycle } = event.event.data.metadata || {};
      if (invoiceId && planId && userId) {
        await provisionVPS(invoiceId, planId, userId, location || 'LONDON', os || 'Windows 2022', billingCycle || 'MONTHLY');
      }
    }

    return res.json({ received: true });
  } catch (e) {
    logger.error('Coinbase webhook error:', e);
    return res.status(400).json({ error: 'Webhook processing failed' });
  }
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
