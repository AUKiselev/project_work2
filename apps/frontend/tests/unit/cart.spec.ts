import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCartStore } from '~/stores/cart';

const tier = (id: number, price = 50000) => ({
  id, name: 'Standard', price, currency: 'RUB' as const,
});

beforeEach(() => {
  setActivePinia(createPinia());
  // Чистим persist-storage перед каждым тестом.
  globalThis.sessionStorage?.clear?.();
});

describe('cart store', () => {
  it('add нового tier создаёт строку', () => {
    const c = useCartStore();
    c.add(tier(1), 2, 'evt-1');
    expect(c.items).toHaveLength(1);
    expect(c.items[0].qty).toBe(2);
    expect(c.eventSlug).toBe('evt-1');
  });

  it('add существующего tier инкрементит qty', () => {
    const c = useCartStore();
    c.add(tier(1), 2, 'evt-1');
    c.add(tier(1), 1, 'evt-1');
    expect(c.items[0].qty).toBe(3);
  });

  it('setQty(0) удаляет позицию', () => {
    const c = useCartStore();
    c.add(tier(1), 2, 'evt-1');
    c.setQty(1, 0);
    expect(c.items).toHaveLength(0);
  });

  it('subtotal = sum(price * qty)', () => {
    const c = useCartStore();
    c.add(tier(1, 10000), 2, 'evt-1');
    c.add(tier(2, 5000), 3, 'evt-1');
    expect(c.subtotal).toBe(20000 + 15000);
  });

  it('reset очищает всё', () => {
    const c = useCartStore();
    c.add(tier(1), 1, 'evt-1');
    c.setPromo('SUMMER10');
    c.reset();
    expect(c.items).toHaveLength(0);
    expect(c.eventSlug).toBeNull();
    expect(c.promoCode).toBeNull();
    expect(c.promoApplied).toBeNull();
  });

  it('hydrate с протухшим TTL чистит state', () => {
    const c = useCartStore();
    c.add(tier(1), 1, 'evt-1');
    // Симулируем "час назад":
    c.lastTouched = Date.now() - 3_600_001;
    c.persist();
    // Новый стор — повторяем persist в storage и читаем из него.
    setActivePinia(createPinia());
    const fresh = useCartStore();
    fresh.hydrate();
    expect(fresh.items).toHaveLength(0);
  });

  it('total = subtotal - discount', () => {
    const c = useCartStore();
    c.add(tier(1, 100000), 1, 'evt-1');
    c.promoApplied = { applied: true, subtotal: 100000, discount: 10000, total: 90000, reason: null };
    expect(c.total).toBe(90000);
  });
});
