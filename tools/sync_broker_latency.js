/**
 * WAT Tool: sync_broker_latency
 * Seeds or refreshes broker latency data in the database.
 * Usage: node tools/sync_broker_latency.js
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

const BROKERS = [
  { broker: 'IC Markets',         london: 1,  newYork: 89, recommended: 'LONDON' },
  { broker: 'Pepperstone',        london: 3,  newYork: 86, recommended: 'LONDON' },
  { broker: 'FXCM',              london: 5,  newYork: 82, recommended: 'LONDON' },
  { broker: 'Exness',            london: 8,  newYork: 92, recommended: 'LONDON' },
  { broker: 'XM Group',          london: 4,  newYork: 85, recommended: 'LONDON' },
  { broker: 'OANDA',             london: 12, newYork: 45, recommended: 'NEW_YORK' },
  { broker: 'IG',                london: 6,  newYork: 78, recommended: 'LONDON' },
  { broker: 'CMC Markets',       london: 7,  newYork: 74, recommended: 'LONDON' },
  { broker: 'Saxo Bank',         london: 9,  newYork: 68, recommended: 'LONDON' },
  { broker: 'Interactive Brokers', london: 15, newYork: 12, recommended: 'NEW_YORK' },
  { broker: 'TD Ameritrade',     london: 88, newYork: 18, recommended: 'NEW_YORK' },
  { broker: 'Charles Schwab',    london: 91, newYork: 15, recommended: 'NEW_YORK' },
  { broker: 'Darwinex',          london: 8,  newYork: 95, recommended: 'LONDON' },
  { broker: 'Admiral Markets',   london: 5,  newYork: 88, recommended: 'LONDON' },
  { broker: 'HotForex',          london: 3,  newYork: 84, recommended: 'LONDON' },
  { broker: 'Tickmill',          london: 2,  newYork: 91, recommended: 'LONDON' },
  { broker: 'FXTM',              london: 6,  newYork: 87, recommended: 'LONDON' },
  { broker: 'RoboForex',         london: 11, newYork: 78, recommended: 'LONDON' },
  { broker: 'EasyMarkets',       london: 9,  newYork: 81, recommended: 'LONDON' },
  { broker: 'Plus500',           london: 7,  newYork: 76, recommended: 'LONDON' },
  { broker: 'FxPro',             london: 4,  newYork: 89, recommended: 'LONDON' },
  { broker: 'NAGA Markets',      london: 10, newYork: 83, recommended: 'LONDON' },
];

async function syncBrokerLatency() {
  logger.info('Starting broker latency sync', { count: BROKERS.length });

  let upserted = 0;
  for (const b of BROKERS) {
    await prisma.brokerLatency.upsert({
      where: { broker: b.broker },
      update: { london: b.london, newYork: b.newYork, recommended: b.recommended },
      create: { broker: b.broker, london: b.london, newYork: b.newYork, recommended: b.recommended },
    });
    upserted++;
  }

  logger.info('Broker latency sync complete', { upserted });
  return { success: true, upserted };
}

syncBrokerLatency()
  .then(r => { console.log(JSON.stringify(r)); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());

export { syncBrokerLatency };
