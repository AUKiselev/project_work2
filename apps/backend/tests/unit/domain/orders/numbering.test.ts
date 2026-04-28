import { generateOrderNumber, generateTicketNumber } from '../../../../src/domain/orders/numbering';

describe('numbering', () => {
  it('generateOrderNumber имеет формат EVT-YYYYMMDD-XXXXXX', () => {
    const n = generateOrderNumber(new Date('2026-04-28T12:00:00Z'));
    expect(n).toMatch(/^EVT-20260428-[0-9A-Z]{6}$/);
  });

  it('generateTicketNumber имеет формат T-YYYYMMDD-XXXXXX', () => {
    const n = generateTicketNumber(new Date('2026-04-28T12:00:00Z'));
    expect(n).toMatch(/^T-20260428-[0-9A-Z]{6}$/);
  });

  it('два подряд вызова дают разные значения', () => {
    const a = generateOrderNumber(new Date());
    const b = generateOrderNumber(new Date());
    expect(a).not.toBe(b);
  });
});
