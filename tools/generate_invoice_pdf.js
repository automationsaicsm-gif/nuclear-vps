/**
 * WAT Tool: generate_invoice_pdf
 * Generates a PDF invoice using PDFKit and saves to .tmp/invoices/
 * Usage: node tools/generate_invoice_pdf.js <invoiceId>
 * Returns: { success: true, filePath: '...' }
 */

import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

const COLORS = {
  base: '#1E1B4B',
  deep: '#13114A',
  coral: '#F87171',
  text: '#C7D2FE',
  heading: '#E0E7FF',
  muted: '#818CF8',
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

async function generateInvoicePDF(invoiceId) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { user: true, items: true, service: { include: { plan: true } } },
  });

  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

  const outDir = path.join(__dirname, '..', '.tmp', 'invoices');
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `${invoice.invoiceNumber}.pdf`);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Background
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(...hexToRgb(COLORS.base));

  // Header bar
  doc.rect(0, 0, doc.page.width, 100).fill(...hexToRgb(COLORS.deep));

  // Logo
  doc.fillColor(...hexToRgb(COLORS.heading))
    .font('Helvetica-Bold')
    .fontSize(26)
    .text('DIP', 50, 35, { continued: true });
  doc.fillColor(...hexToRgb(COLORS.coral)).text('GATE');

  // Invoice title
  doc.fillColor(...hexToRgb(COLORS.coral))
    .font('Helvetica-Bold')
    .fontSize(14)
    .text('INVOICE', doc.page.width - 150, 38, { width: 100, align: 'right' });
  doc.fillColor(...hexToRgb(COLORS.heading))
    .fontSize(10)
    .text(invoice.invoiceNumber, doc.page.width - 150, 58, { width: 100, align: 'right' });

  // Divider
  doc.moveTo(50, 110).lineTo(doc.page.width - 50, 110)
    .strokeColor(...hexToRgb('#312E81')).lineWidth(1).stroke();

  // Bill to / from info
  doc.fillColor(...hexToRgb(COLORS.muted)).fontSize(9).font('Helvetica-Bold')
    .text('BILLED TO', 50, 130);
  doc.fillColor(...hexToRgb(COLORS.heading)).fontSize(11).font('Helvetica-Bold')
    .text(`${invoice.user.firstName} ${invoice.user.lastName}`, 50, 148);
  doc.fillColor(...hexToRgb(COLORS.text)).fontSize(10).font('Helvetica')
    .text(invoice.user.email, 50, 164)
    .text(invoice.user.country, 50, 180);

  doc.fillColor(...hexToRgb(COLORS.muted)).fontSize(9).font('Helvetica-Bold')
    .text('INVOICE DATE', 350, 130)
    .text('DUE DATE', 350, 165)
    .text('STATUS', 350, 200);
  doc.fillColor(...hexToRgb(COLORS.heading)).fontSize(10).font('Helvetica')
    .text(new Date(invoice.createdAt).toLocaleDateString(), 430, 130)
    .text(new Date(invoice.dueDate).toLocaleDateString(), 430, 165);
  doc.fillColor(...hexToRgb(invoice.status === 'PAID' ? '#34D399' : COLORS.coral))
    .text(invoice.status, 430, 200);

  // Items table header
  const tableTop = 240;
  doc.rect(50, tableTop, doc.page.width - 100, 28).fill(...hexToRgb(COLORS.deep));
  doc.fillColor(...hexToRgb(COLORS.muted)).fontSize(9).font('Helvetica-Bold')
    .text('DESCRIPTION', 65, tableTop + 10)
    .text('QTY', 360, tableTop + 10)
    .text('UNIT PRICE', 400, tableTop + 10)
    .text('TOTAL', 480, tableTop + 10);

  // Items
  const items = invoice.items.length > 0 ? invoice.items : [{
    description: `${invoice.service?.plan?.name || 'VPS Hosting'} — ${invoice.service?.billingCycle || 'MONTHLY'}`,
    quantity: 1,
    amount: invoice.amount,
  }];

  let y = tableTop + 38;
  items.forEach((item, i) => {
    if (i % 2 === 0) {
      doc.rect(50, y - 5, doc.page.width - 100, 26).fill(...hexToRgb('#252272'));
    }
    doc.fillColor(...hexToRgb(COLORS.text)).fontSize(10).font('Helvetica')
      .text(item.description, 65, y, { width: 285 })
      .text(String(item.quantity || 1), 360, y)
      .text(`$${(item.amount / (item.quantity || 1)).toFixed(2)}`, 400, y)
      .text(`$${item.amount.toFixed(2)}`, 480, y);
    y += 32;
  });

  // Total
  doc.moveTo(50, y + 10).lineTo(doc.page.width - 50, y + 10)
    .strokeColor(...hexToRgb('#312E81')).stroke();
  doc.fillColor(...hexToRgb(COLORS.muted)).fontSize(10).font('Helvetica-Bold')
    .text('TOTAL', 400, y + 22);
  doc.fillColor(...hexToRgb(COLORS.coral)).fontSize(16).font('Helvetica-Bold')
    .text(`$${invoice.amount.toFixed(2)}`, 470, y + 18);

  // Footer
  const footerY = doc.page.height - 70;
  doc.rect(0, footerY, doc.page.width, 70).fill(...hexToRgb(COLORS.deep));
  doc.fillColor(...hexToRgb(COLORS.muted)).fontSize(8).font('Helvetica')
    .text('Thank you for your business. For questions, contact support@dipgate.com', 50, footerY + 20, { align: 'center', width: doc.page.width - 100 })
    .text(`© ${new Date().getFullYear()} Dipgate · dipgate.com`, 50, footerY + 38, { align: 'center', width: doc.page.width - 100 });

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { success: true, filePath };
}

const [,, invoiceId] = process.argv;
if (invoiceId) {
  generateInvoicePDF(invoiceId)
    .then(r => { console.log(JSON.stringify(r)); process.exit(0); })
    .catch(e => { console.error(e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
}

export { generateInvoicePDF };
