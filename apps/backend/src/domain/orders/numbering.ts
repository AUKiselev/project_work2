import { randomBytes } from 'node:crypto';

const formatDate = (d: Date): string => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
};

const randomSuffix = (): string =>
  randomBytes(4).toString('hex').slice(0, 6).toUpperCase();

export const generateOrderNumber = (now: Date = new Date()): string =>
  `EVT-${formatDate(now)}-${randomSuffix()}`;

export const generateTicketNumber = (now: Date = new Date()): string =>
  `T-${formatDate(now)}-${randomSuffix()}`;
