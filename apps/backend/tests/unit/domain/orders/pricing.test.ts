import { calculateOrderTotals } from '../../../../src/domain/orders/pricing';

describe('calculateOrderTotals', () => {
  const items = [
    { unitPrice: 10000, quantity: 2 },
    { unitPrice: 5000, quantity: 1 },
  ];

  it('возвращает subtotal без промо', () => {
    const r = calculateOrderTotals({ items });
    expect(r.subtotal).toBe(25000);
    expect(r.discount).toBe(0);
    expect(r.total).toBe(25000);
    expect(r.appliedPromo).toBe(false);
  });

  it('применяет percent промо', () => {
    const r = calculateOrderTotals({
      items,
      promo: { discountType: 'percent', discountValue: 10 },
    });
    expect(r.discount).toBe(2500);
    expect(r.total).toBe(22500);
    expect(r.appliedPromo).toBe(true);
  });

  it('применяет fixed промо', () => {
    const r = calculateOrderTotals({
      items,
      promo: { discountType: 'fixed', discountValue: 3000 },
    });
    expect(r.discount).toBe(3000);
    expect(r.total).toBe(22000);
  });

  it('обрезает discount до subtotal (не уходит в минус)', () => {
    const r = calculateOrderTotals({
      items: [{ unitPrice: 1000, quantity: 1 }],
      promo: { discountType: 'fixed', discountValue: 5000 },
    });
    expect(r.discount).toBe(1000);
    expect(r.total).toBe(0);
  });

  it('100% промо обнуляет total', () => {
    const r = calculateOrderTotals({
      items,
      promo: { discountType: 'percent', discountValue: 100 },
    });
    expect(r.discount).toBe(25000);
    expect(r.total).toBe(0);
  });

  it('бросает ошибку при пустом items', () => {
    expect(() => calculateOrderTotals({ items: [] })).toThrow('items must be non-empty');
  });
});
