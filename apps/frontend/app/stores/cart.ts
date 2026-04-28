// Корзина: cross-page state с persist в sessionStorage. TTL 1 час.
// Применение промокода — отдельный action applyPromo, делает запрос
// preview-promo через $api (вызывается со стороны useOrder, чтобы
// store не зависел от Nuxt-плагинов).
import { defineStore } from 'pinia';
import type { PreviewPromoResponse, TicketTier } from '~/types/api';

const STORAGE_KEY = 'pw2.cart';
const TTL_MS = 3_600_000; // 1 час

export interface CartItem {
  tierId: number;
  qty: number;
  snapshot: { name: string; price: number; currency: 'RUB' };
}

interface CartState {
  eventSlug: string | null;
  items: CartItem[];
  promoCode: string | null;
  promoApplied: PreviewPromoResponse | null;
  lastTouched: number;
}

const initialState = (): CartState => ({
  eventSlug: null,
  items: [],
  promoCode: null,
  promoApplied: null,
  lastTouched: Date.now(),
});

export const useCartStore = defineStore('cart', {
  state: initialState,
  getters: {
    itemsCount: (s) => s.items.reduce((acc, i) => acc + i.qty, 0),
    isEmpty: (s) => s.items.length === 0,
    subtotal: (s) => s.items.reduce((acc, i) => acc + i.snapshot.price * i.qty, 0),
    discount: (s) => s.promoApplied?.applied ? s.promoApplied.discount : 0,
    total(): number {
      return this.subtotal - this.discount;
    },
    byTier: (s) => (id: number) => s.items.find((i) => i.tierId === id),
  },
  actions: {
    add(
      tier: Pick<TicketTier, 'id' | 'name' | 'price' | 'currency'>,
      qty: number,
      eventSlug: string,
    ) {
      this._touch();
      if (!this.eventSlug) this.eventSlug = eventSlug;
      const existing = this.items.find((i) => i.tierId === tier.id);
      if (existing) {
        existing.qty += qty;
      } else {
        this.items.push({
          tierId: tier.id,
          qty,
          snapshot: { name: tier.name, price: tier.price, currency: tier.currency },
        });
      }
      this.persist();
    },

    setQty(tierId: number, qty: number) {
      this._touch();
      const i = this.items.findIndex((x) => x.tierId === tierId);
      if (i < 0) return;
      if (qty <= 0) {
        this.items.splice(i, 1);
      } else {
        this.items[i].qty = qty;
      }
      if (this.items.length === 0) this.eventSlug = null;
      this.persist();
    },

    remove(tierId: number) {
      this.setQty(tierId, 0);
    },

    setPromo(code: string | null) {
      this._touch();
      this.promoCode = code?.trim().toUpperCase() || null;
      this.promoApplied = null;
      this.persist();
    },

    setPromoResult(res: PreviewPromoResponse | null) {
      this._touch();
      this.promoApplied = res;
      this.persist();
    },

    reset() {
      const fresh = initialState();
      this.$patch(fresh);
      this.persist();
    },

    persist() {
      if (typeof window === 'undefined') return;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.$state));
    },

    hydrate() {
      if (typeof window === 'undefined') return;
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as CartState;
        if (Date.now() - (parsed.lastTouched ?? 0) > TTL_MS) {
          sessionStorage.removeItem(STORAGE_KEY);
          return;
        }
        this.$patch(parsed);
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    },

    _touch() {
      this.lastTouched = Date.now();
    },
  },
});
