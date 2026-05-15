import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { validateBody } from '../middleware/validate';
import { success, error } from '../utils/response';
import { sendTicketReplyEmail } from '../services/email.service';

const router = Router();
router.use(authenticate);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), '../../.tmp/uploads')),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.txt', '.log'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Invalid file type'));
  },
});

const generateTicketNumber = async () => {
  const count = await prisma.ticket.count();
  return `TKT-${String(count + 1).padStart(6, '0')}`;
};

const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  department: z.enum(['GENERAL', 'BILLING', 'TECHNICAL', 'SALES']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  message: z.string().min(20),
});

const replySchema = z.object({
  message: z.string().min(1),
});

// GET /api/v1/tickets
router.get('/', async (req: AuthRequest, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { userId: req.user!.id },
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { updatedAt: 'desc' },
  });
  return success(res, tickets);
});

// POST /api/v1/tickets
router.post('/', upload.array('attachments', 3), validateBody(createTicketSchema), async (req: AuthRequest, res) => {
  const { subject, department, priority, message } = req.body;
  const ticketNumber = await generateTicketNumber();
  const files = (req.files as Express.Multer.File[])?.map((f) => f.path) || [];

  const ticket = await prisma.ticket.create({
    data: {
      userId: req.user!.id,
      ticketNumber,
      subject,
      department,
      priority,
      messages: {
        create: {
          authorId: req.user!.id,
          authorRole: 'CLIENT',
          message,
          attachments: files,
        },
      },
    },
    include: { messages: true },
  });

  return success(res, ticket, 201);
});

// GET /api/v1/tickets/:id
router.get('/:id', async (req: AuthRequest, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!ticket) return error(res, 'Ticket not found', 404);
  if (ticket.userId !== req.user!.id && !['ADMIN', 'SUPPORT'].includes(req.user!.role))
    return error(res, 'Access denied', 403);
  return success(res, ticket);
});

// POST /api/v1/tickets/:id/reply
router.post('/:id/reply', upload.array('attachments', 3), validateBody(replySchema), async (req: AuthRequest, res) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return error(res, 'Ticket not found', 404);
  if (ticket.userId !== req.user!.id && !['ADMIN', 'SUPPORT'].includes(req.user!.role))
    return error(res, 'Access denied', 403);
  if (['RESOLVED', 'CLOSED'].includes(ticket.status))
    return error(res, 'Ticket is closed', 400);

  const files = (req.files as Express.Multer.File[])?.map((f) => f.path) || [];
  const role = req.user!.role as 'CLIENT' | 'ADMIN' | 'SUPPORT';

  const message = await prisma.ticketMessage.create({
    data: {
      ticketId: ticket.id,
      authorId: req.user!.id,
      authorRole: role,
      message: req.body.message,
      attachments: files,
    },
  });

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: role === 'CLIENT' ? 'OPEN' : 'IN_PROGRESS', updatedAt: new Date() },
  });

  if (role !== 'CLIENT') {
    const owner = await prisma.user.findUnique({ where: { id: ticket.userId } });
    if (owner) {
      try {
        await sendTicketReplyEmail(owner.email, owner.firstName, ticket.ticketNumber, ticket.subject);
      } catch {}
    }
  }

  return success(res, message);
});

// PUT /api/v1/tickets/:id/close
router.put('/:id/close', async (req: AuthRequest, res) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return error(res, 'Ticket not found', 404);
  if (ticket.userId !== req.user!.id && !['ADMIN', 'SUPPORT'].includes(req.user!.role))
    return error(res, 'Access denied', 403);

  await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'CLOSED' } });
  return success(res, { message: 'Ticket closed' });
});

export default router;
