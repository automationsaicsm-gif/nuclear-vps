import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { success, error } from '../utils/response';
import path from 'path';
import fs from 'fs';

const router = Router();
router.use(authenticate);

// GET /api/v1/invoices
router.get('/', async (req: AuthRequest, res) => {
  const invoices = await prisma.invoice.findMany({
    where: { userId: req.user!.id },
    include: { items: true, service: { include: { plan: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return success(res, invoices);
});

// GET /api/v1/invoices/:id
router.get('/:id', async (req: AuthRequest, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { items: true, service: { include: { plan: true } }, user: { select: { firstName: true, lastName: true, email: true, country: true } } },
  });
  if (!invoice) return error(res, 'Invoice not found', 404);
  if (invoice.userId !== req.user!.id && req.user!.role !== 'ADMIN')
    return error(res, 'Access denied', 403);
  return success(res, invoice);
});

// GET /api/v1/invoices/:id/pdf
router.get('/:id/pdf', async (req: AuthRequest, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { items: true, user: { select: { firstName: true, lastName: true, email: true } } },
  });
  if (!invoice) return error(res, 'Invoice not found', 404);
  if (invoice.userId !== req.user!.id && req.user!.role !== 'ADMIN')
    return error(res, 'Access denied', 403);

  const tmpDir = path.join(process.cwd(), '../../.tmp/invoices');
  fs.mkdirSync(tmpDir, { recursive: true });

  const filePath = path.join(tmpDir, `${invoice.invoiceNumber}.pdf`);
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Dark-themed PDF
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#1E1B4B');
  doc.fill('#E0E7FF').font('Helvetica-Bold').fontSize(28).text('Nuclear VPS', 50, 50, { continued: true });
  doc.fill('#F87171').text('  VPS HOSTING', { continued: false });

  doc.fill('#E0E7FF').fontSize(20).text('INVOICE', 50, 110);
  doc.fill('#818CF8').fontSize(11)
    .text(`Invoice Number: ${invoice.invoiceNumber}`, 50, 140)
    .text(`Date: ${invoice.createdAt.toLocaleDateString()}`, 50, 158)
    .text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`, 50, 176)
    .text(`Status: ${invoice.status}`, 50, 194);

  doc.fill('#C7D2FE').fontSize(11)
    .text(`${invoice.user.firstName} ${invoice.user.lastName}`, 350, 140)
    .text(invoice.user.email, 350, 158);

  doc.moveTo(50, 220).lineTo(545, 220).stroke('#312E81');

  doc.fill('#E0E7FF').fontSize(12).text('Description', 50, 235);
  doc.fill('#E0E7FF').text('Amount', 480, 235, { align: 'right' });

  doc.moveTo(50, 255).lineTo(545, 255).stroke('#312E81');

  let y = 270;
  for (const item of invoice.items) {
    doc.fill('#C7D2FE').fontSize(11).text(item.description, 50, y);
    doc.fill(item.amount < 0 ? '#34D399' : '#F87171').text(`$${Math.abs(item.amount).toFixed(2)}`, 480, y, { align: 'right' });
    y += 22;
  }

  doc.moveTo(50, y + 5).lineTo(545, y + 5).stroke('#312E81');
  doc.fill('#E0E7FF').fontSize(14).text(`Total: $${invoice.amount.toFixed(2)}`, 480, y + 15, { align: 'right' });

  doc.fill('#818CF8').fontSize(10).text('Thank you for your business! Questions? support@Nuclear VPS.com', 50, 700, { align: 'center', width: 495 });
  doc.end();

  await new Promise<void>((resolve) => stream.on('finish', () => resolve()));

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);
  fs.createReadStream(filePath).pipe(res);
});

export default router;
