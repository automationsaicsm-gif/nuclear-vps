/**
 * WAT Tool: calculate_affiliate_commission
 * Records a commission when a referred user makes a payment.
 * Usage: node tools/calculate_affiliate_commission.js <paymentAmount> <referredUserId>
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
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

const COMMISSION_RATE = 0.15;

async function calculateAffiliateCommission(paymentAmount, referredUserId) {
  // Find the referral record
  const referral = await prisma.affiliateReferral.findUnique({
    where: { referredId: referredUserId },
    include: { referrer: true },
  });

  if (!referral) {
    logger.info('No referral found for user', { referredUserId });
    return { success: true, commission: 0, message: 'No referral found' };
  }

  const commission = Math.round(paymentAmount * COMMISSION_RATE * 100) / 100;

  // Update commission total on the referral
  await prisma.affiliateReferral.update({
    where: { id: referral.id },
    data: {
      commission: { increment: commission },
      status: 'earned',
    },
  });

  // Add commission to referrer's credit balance
  await prisma.user.update({
    where: { id: referral.referrerId },
    data: { creditBalance: { increment: commission } },
  });

  logger.info('Commission recorded', {
    referrerId: referral.referrerId,
    referredUserId,
    paymentAmount,
    commission,
  });

  // Send notification email to referrer
  try {
    const { sendEmail } = await import('./send_email.js');
    await sendEmail(referral.referrer.email, null, 'affiliate_commission', {
      firstName: referral.referrer.firstName,
      commission: commission.toFixed(2),
      paymentAmount: paymentAmount.toFixed(2),
    });
  } catch (e) {
    logger.error('Failed to send commission email', { error: e.message });
  }

  return { success: true, commission, referrerId: referral.referrerId };
}

const [,, paymentAmount, referredUserId] = process.argv;
if (paymentAmount && referredUserId) {
  calculateAffiliateCommission(parseFloat(paymentAmount), referredUserId)
    .then(r => { console.log(JSON.stringify(r)); process.exit(0); })
    .catch(e => { console.error(e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
}

export { calculateAffiliateCommission };
