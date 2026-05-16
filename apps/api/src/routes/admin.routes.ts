import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/authenticate';
import { validateBody } from '../middleware/validate';
import { success } from '../utils/response';

const router = Router();
router.use(authenticate, requireAdmin);

// GET /api/v1/admin/stats
router.get('/stats', async (_req, res) => {
  const [totalUsers, activeServices, openTickets, unpaidInvoices, recentInvoices, recentTickets] = await Promise.all([
    prisma.user.count(),
    prisma.service.count({ where: { status: 'ACTIVE' } }),
    prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.invoice.count({ where: { status: 'UNPAID' } }),
    prisma.invoice.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    }),
    prisma.ticket.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true } } },
    }),
  ]);

  const mrr = recentInvoices
    .filter((i) => i.status === 'PAID' && i.createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .reduce((sum, i) => sum + i.amount, 0);

  return success(res, { totalUsers, activeServices, openTickets, unpaidInvoices, mrr, recentInvoices, recentTickets });
});

// GET /api/v1/admin/revenue-chart
router.get('/revenue-chart', async (_req, res) => {
  const months: { month: string; revenue: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const invoices = await prisma.invoice.findMany({
      where: { status: 'PAID', paidAt: { gte: start, lte: end } },
      select: { amount: true },
    });
    months.push({
      month: start.toLocaleString('default', { month: 'short', year: '2-digit' }),
      revenue: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    });
  }
  return success(res, months);
});

// GET /api/v1/admin/users
router.get('/users', async (req, res) => {
  const { search, role, page = '1' } = req.query as Record<string, string>;
  const take = 25;
  const skip = (parseInt(page) - 1) * take;

  const where: Record<string, unknown> = {};
  if (search) where.OR = [{ email: { contains: search } }, { firstName: { contains: search } }, { lastName: { contains: search } }];
  if (role) where.role = role;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, firstName: true, lastName: true, email: true,
        country: true, role: true, createdAt: true,
        _count: { select: { services: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.user.count({ where }),
  ]);

  return success(res, { users, total, page: parseInt(page), pages: Math.ceil(total / take) });
});

// GET /api/v1/admin/users/:id
router.get('/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      services: { include: { plan: true } },
      invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
      tickets: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  return success(res, user);
});

// PUT /api/v1/admin/users/:id
router.put('/users/:id', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: req.body,
  });
  return success(res, user);
});

// POST /api/v1/admin/users/:id/suspend
router.post('/users/:id/suspend', async (req, res) => {
  const services = await prisma.service.updateMany({
    where: { userId: req.params.id, status: 'ACTIVE' },
    data: { status: 'SUSPENDED' },
  });
  return success(res, { message: `Suspended ${services.count} services` });
});

// GET /api/v1/admin/services
router.get('/services', async (req, res) => {
  const { status, page = '1' } = req.query as Record<string, string>;
  const take = 25;
  const skip = (parseInt(page) - 1) * take;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      include: { plan: true, user: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.service.count({ where }),
  ]);

  return success(res, { services, total, page: parseInt(page), pages: Math.ceil(total / take) });
});

// PUT /api/v1/admin/services/:id
router.put('/services/:id', async (req, res) => {
  const svc = await prisma.service.update({ where: { id: req.params.id }, data: req.body });
  return success(res, svc);
});

// GET /api/v1/admin/invoices
router.get('/invoices', async (req, res) => {
  const { status, page = '1' } = req.query as Record<string, string>;
  const take = 25;
  const skip = (parseInt(page) - 1) * take;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { user: { select: { email: true, firstName: true, lastName: true } }, items: true },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.invoice.count({ where }),
  ]);

  return success(res, { invoices, total, page: parseInt(page), pages: Math.ceil(total / take) });
});

// PUT /api/v1/admin/invoices/:id
router.put('/invoices/:id', async (req, res) => {
  const invoice = await prisma.invoice.update({
    where: { id: req.params.id },
    data: { ...req.body, paidAt: req.body.status === 'PAID' ? new Date() : undefined },
  });
  return success(res, invoice);
});

// GET /api/v1/admin/tickets
router.get('/tickets', async (req, res) => {
  const { status, department, priority, page = '1' } = req.query as Record<string, string>;
  const take = 25;
  const skip = (parseInt(page) - 1) * take;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (department) where.department = department;
  if (priority) where.priority = priority;

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
      take,
      skip,
    }),
    prisma.ticket.count({ where }),
  ]);

  return success(res, { tickets, total, page: parseInt(page), pages: Math.ceil(total / take) });
});

// POST /api/v1/admin/tickets/:id/reply
router.post('/tickets/:id/reply', validateBody(z.object({ message: z.string().min(1) })), async (req: AuthRequest, res) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

  const message = await prisma.ticketMessage.create({
    data: {
      ticketId: ticket.id,
      authorId: req.user!.id,
      authorRole: 'ADMIN',
      message: req.body.message,
      attachments: [],
    },
  });
  await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'IN_PROGRESS' } });
  return success(res, message);
});

// GET /api/v1/admin/plans
router.get('/plans', async (_req, res) => {
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } });
  return success(res, plans);
});

// POST /api/v1/admin/plans
router.post('/plans', async (req, res) => {
  const plan = await prisma.plan.create({ data: req.body });
  return success(res, plan, 201);
});

// PUT /api/v1/admin/plans/:id
router.put('/plans/:id', async (req, res) => {
  const plan = await prisma.plan.update({ where: { id: req.params.id }, data: req.body });
  return success(res, plan);
});

// GET /api/v1/admin/coupons
router.get('/coupons', async (_req, res) => {
  const coupons = await prisma.couponCode.findMany({ orderBy: { createdAt: 'desc' } });
  return success(res, coupons);
});

// POST /api/v1/admin/coupons
router.post('/coupons', validateBody(z.object({
  code: z.string().min(3).max(20),
  discount: z.number().min(1).max(100),
  maxUses: z.number().optional(),
  expiresAt: z.string().optional(),
})), async (req, res) => {
  const coupon = await prisma.couponCode.create({
    data: {
      ...req.body,
      code: req.body.code.toUpperCase(),
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
    },
  });
  return success(res, coupon, 201);
});

// PUT /api/v1/admin/coupons/:id
router.put('/coupons/:id', async (req, res) => {
  const coupon = await prisma.couponCode.update({ where: { id: req.params.id }, data: req.body });
  return success(res, coupon);
});

// GET /api/v1/admin/affiliate/withdrawals
router.get('/affiliate/withdrawals', async (_req, res) => {
  const withdrawals = await prisma.affiliateWithdrawal.findMany({
    orderBy: { createdAt: 'desc' },
  });
  const withUsers = await Promise.all(
    withdrawals.map(async (w) => {
      const user = await prisma.user.findUnique({
        where: { id: w.userId },
        select: { firstName: true, lastName: true, email: true },
      });
      return { ...w, user };
    })
  );
  return success(res, withUsers);
});

// PUT /api/v1/admin/affiliate/withdrawals/:id
router.put('/affiliate/withdrawals/:id', async (req, res) => {
  const withdrawal = await prisma.affiliateWithdrawal.update({
    where: { id: req.params.id },
    data: { status: req.body.status },
  });
  return success(res, withdrawal);
});

// GET /api/v1/admin/settings
router.get('/settings', async (_req, res) => {
  const settings = await prisma.siteSetting.findMany();
  return success(res, { settings });
});

// PUT /api/v1/admin/settings
router.put('/settings', async (req, res) => {
  const entries: { key: string; value: string }[] = req.body.settings ?? [];
  for (const { key, value } of entries) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }
  return success(res, { message: 'Settings updated' });
});

// POST /api/v1/admin/settings/test-email
router.post('/settings/test-email', async (req: AuthRequest, res) => {
  try {
    const { sendEmail } = await import('../services/email.service');
    const admin = await prisma.user.findUnique({ where: { id: req.user!.id } });
    await sendEmail(
      admin!.email,
      'Nuclear VPS SMTP Test',
      '<h1 style="color:#F87171">SMTP is working!</h1><p style="color:#C7D2FE">Your email configuration is correct.</p>'
    );
    return success(res, { message: 'Test email sent successfully' });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/v1/admin/users/:id/impersonate
router.post('/users/:id/impersonate', async (req: AuthRequest, res) => {
  const jwt = await import('jsonwebtoken');
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });

  const token = jwt.default.sign(
    { userId: user.id, impersonatedBy: req.user!.id },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  return success(res, {
    token,
    user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
  });
});

export default router;
