// Тонкая обёртка над cartStore + applyPromo через useOrder.
import { useCartStore } from '~/stores/cart';
import { useOrder } from '~/composables/useOrder';

export const useCart = () => {
  const store = useCartStore();
  const order = useOrder();

  const applyPromo = async (eventId: number) => {
    if (!store.promoCode) return;
    const items = store.items.map((i) => ({ tierId: i.tierId, quantity: i.qty }));
    if (items.length === 0) return;
    try {
      const res = await order.previewPromo({ eventId, items, promoCode: store.promoCode });
      store.setPromoResult(res);
    } catch {
      store.setPromoResult({ subtotal: store.subtotal, discount: 0, total: store.subtotal, applied: false, reason: 'invalid' });
    }
  };

  return { store, applyPromo };
};
