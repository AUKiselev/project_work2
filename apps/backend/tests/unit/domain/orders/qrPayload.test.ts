import { signTicketQrPayload, verifyTicketQrPayload } from '../../../../src/domain/orders/qrPayload';

const SECRET = 'test-secret-do-not-use-in-prod';

describe('qrPayload', () => {
  const data = { ticketId: 1, eventId: 42, number: 'T-20260428-ABCDEF' };

  it('подписывает и верифицирует payload', () => {
    const token = signTicketQrPayload(data, SECRET);
    const verified = verifyTicketQrPayload(token, SECRET);
    expect(verified).toMatchObject(data);
    expect(typeof verified?.iat).toBe('number');
  });

  it('возвращает null при неверной подписи', () => {
    const token = signTicketQrPayload(data, SECRET);
    const tampered = token.slice(0, -4) + 'AAAA';
    expect(verifyTicketQrPayload(tampered, SECRET)).toBeNull();
  });

  it('возвращает null при другом секрете', () => {
    const token = signTicketQrPayload(data, SECRET);
    expect(verifyTicketQrPayload(token, 'other-secret')).toBeNull();
  });

  it('возвращает null на мусорный вход', () => {
    expect(verifyTicketQrPayload('garbage', SECRET)).toBeNull();
    expect(verifyTicketQrPayload('a.b', SECRET)).toBeNull();
  });
});
