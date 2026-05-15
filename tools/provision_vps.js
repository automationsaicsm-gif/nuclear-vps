/**
 * WAT Tool: provision_vps
 * Stub provisioner. Simulates VPS provisioning, generates credentials,
 * marks the service ACTIVE, and sends order confirmation email.
 * Usage: node tools/provision_vps.js <serviceId>
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { createLogger, transports, format } from 'winston';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();
const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

function generateIP(location) {
  const pools = {
    LONDON: () => `185.${Math.floor(Math.random() * 50 + 100)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254 + 1)}`,
    NEW_YORK: () => `64.${Math.floor(Math.random() * 30 + 180)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254 + 1)}`,
  };
  return (pools[location] || pools.LONDON)();
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length: 16 }, () => chars[crypto.randomInt(chars.length)]).join('');
}

function generateHostname(planSlug, location) {
  const loc = location === 'LONDON' ? 'lon' : 'nyc';
  const id = crypto.randomBytes(3).toString('hex');
  return `${planSlug}-${loc}-${id}.dipgate.com`;
}

async function provisionVPS(serviceId) {
  logger.info('Starting VPS provisioning', { serviceId });

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { user: true, plan: true },
  });

  if (!service) throw new Error(`Service ${serviceId} not found`);
  if (service.status === 'ACTIVE') {
    logger.warn('Service already active', { serviceId });
    return { success: true, message: 'Already active' };
  }

  const password = generatePassword();
  const ipAddress = generateIP(service.location);
  const hostname = generateHostname(service.plan?.slug || 'vps', service.location);

  // Simulate provisioning delay (in production: call Virtualizor/Proxmox API here)
  await new Promise(r => setTimeout(r, 2000));

  // Update service record
  const updated = await prisma.service.update({
    where: { id: serviceId },
    data: {
      status: 'ACTIVE',
      ipAddress,
      hostname,
      username: 'Administrator',
      // In production, hash password before storing; here we store plaintext for the stub
      passwordHash: password,
    },
  });

  logger.info('VPS provisioned', { serviceId, ipAddress, hostname });

  // Mark related invoice as PAID
  const invoice = await prisma.invoice.findFirst({
    where: { serviceId, status: 'UNPAID' },
  });
  if (invoice) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  // Send confirmation email
  try {
    const { sendEmail } = await import('./send_email.js');
    await sendEmail(service.user.email, null, 'order_confirmation', {
      firstName: service.user.firstName,
      planName: service.plan?.name || 'VPS',
      location: service.location,
      ipAddress,
      username: 'Administrator',
      password,
      os: service.os,
      invoiceNumber: invoice?.invoiceNumber || 'N/A',
    });
  } catch (e) {
    logger.error('Failed to send confirmation email', { error: e.message });
  }

  return { success: true, ipAddress, hostname, password };
}

const [,, serviceId] = process.argv;
if (serviceId) {
  provisionVPS(serviceId)
    .then(r => { console.log(JSON.stringify(r)); process.exit(0); })
    .catch(e => { console.error(e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
}

export { provisionVPS };
