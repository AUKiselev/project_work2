import { describe, it, expect } from 'vitest';
import { formatPrice, formatDate, formatDateRange } from '~/utils/format';

describe('formatPrice', () => {
  it('форматирует копейки в рубли с разрядами', () => {
    expect(formatPrice(990000, 'RUB')).toBe('9 900 ₽');
    expect(formatPrice(150, 'RUB')).toBe('2 ₽'); // 150 копеек = 1.50 руб → 2 руб (Math.round)
  });
  it('zero → "Бесплатно"', () => {
    expect(formatPrice(0, 'RUB')).toBe('Бесплатно');
  });
});

describe('formatDate', () => {
  it('форматирует ISO в "12 мая 2026, 13:00" в Europe/Moscow', () => {
    const out = formatDate('2026-05-12T10:00:00Z', 'Europe/Moscow');
    expect(out).toBe('12 мая 2026, 13:00');
  });
});

describe('formatDateRange', () => {
  it('одинаковый день → "12 мая 2026, 10:00 — 18:00"', () => {
    const out = formatDateRange(
      '2026-05-12T07:00:00Z',
      '2026-05-12T15:00:00Z',
      'Europe/Moscow',
    );
    expect(out).toBe('12 мая 2026, 10:00 — 18:00');
  });
  it('разные дни → "12 мая — 14 мая 2026"', () => {
    const out = formatDateRange(
      '2026-05-12T07:00:00Z',
      '2026-05-14T15:00:00Z',
      'Europe/Moscow',
    );
    expect(out).toBe('12 мая — 14 мая 2026');
  });
  it('без endsAt → один formatDate', () => {
    const out = formatDateRange('2026-05-12T07:00:00Z', undefined, 'Europe/Moscow');
    expect(out).toBe('12 мая 2026, 10:00');
  });
});
