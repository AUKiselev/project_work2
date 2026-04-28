export interface PricingItem {
  unitPrice: number;
  quantity: number;
}

export interface PricingPromo {
  discountType: 'percent' | 'fixed';
  discountValue: number;
}

export interface PricingResult {
  subtotal: number;
  discount: number;
  total: number;
  appliedPromo: boolean;
}

export const calculateOrderTotals = (params: {
  items: PricingItem[];
  promo?: PricingPromo | null;
}): PricingResult => {
  if (!params.items.length) {
    throw new Error('items must be non-empty');
  }

  const subtotal = params.items.reduce(
    (sum, it) => sum + it.unitPrice * it.quantity,
    0,
  );

  let discount = 0;
  if (params.promo) {
    if (params.promo.discountType === 'percent') {
      discount = Math.floor((subtotal * params.promo.discountValue) / 100);
    } else {
      discount = params.promo.discountValue;
    }
    if (discount > subtotal) discount = subtotal;
  }

  return {
    subtotal,
    discount,
    total: subtotal - discount,
    appliedPromo: !!params.promo,
  };
};
