import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TicketQrData {
  ticketId: number;
  eventId: number;
  number: string;
}

interface SignedPayload extends TicketQrData {
  iat: number;
}

const b64url = (buf: Buffer): string =>
  buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const fromB64url = (s: string): Buffer =>
  Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

const sign = (data: string, secret: string): string =>
  b64url(createHmac('sha256', secret).update(data).digest());

export const signTicketQrPayload = (data: TicketQrData, secret: string): string => {
  const payload: SignedPayload = { ...data, iat: Math.floor(Date.now() / 1000) };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = sign(body, secret);
  return `${body}.${sig}`;
};

export const verifyTicketQrPayload = (
  token: string,
  secret: string,
): SignedPayload | null => {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = sign(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(fromB64url(body).toString('utf8')) as SignedPayload;
  } catch {
    return null;
  }
};
