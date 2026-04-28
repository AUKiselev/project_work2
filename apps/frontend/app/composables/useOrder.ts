// Заказы и mock-pay. createOrder/markPaid/findOneMine/listMine.
import type {
  CreateOrderPayload, Order, PreviewPromoResponse, StrapiCollection, StrapiSingle,
} from '~/types/api';
import { unwrapStrapi } from '~/utils/api';

const POPULATE_ORDER = [
  'items.tier', 'tickets.tier', 'tickets.event.venue', 'promoCode',
];

export const useOrder = () => {
  const { $api } = useNuxtApp();

  const previewPromo = async (payload: {
    eventId: number;
    items: { tierId: number; quantity: number }[];
    promoCode?: string;
  }): Promise<PreviewPromoResponse> => {
    const res = await ($api as any)('/orders/preview-promo', { method: 'POST', body: payload });
    return res as PreviewPromoResponse;
  };

  const create = async (payload: CreateOrderPayload): Promise<Order> => {
    const res = await ($api as any)('/orders', { method: 'POST', body: payload });
    return unwrapStrapi(res as StrapiSingle<Order>);
  };

  const markPaid = async (id: number): Promise<Order> => {
    const res = await ($api as any)(`/orders/${id}/mark-paid`, { method: 'POST' });
    return unwrapStrapi(res as StrapiSingle<Order>);
  };

  const listMine = async (): Promise<Order[]> => {
    const query: Record<string, any> = { sort: 'createdAt:desc' };
    POPULATE_ORDER.forEach((p, i) => { query[`populate[${i}]`] = p; });
    const res = await ($api as any)('/me/orders', { query });
    return unwrapStrapi(res as StrapiCollection<Order>);
  };

  const findOneMine = async (id: number): Promise<Order> => {
    const query: Record<string, any> = {};
    POPULATE_ORDER.forEach((p, i) => { query[`populate[${i}]`] = p; });
    const res = await ($api as any)(`/me/orders/${id}`, { query });
    return unwrapStrapi(res as StrapiSingle<Order>);
  };

  return { previewPromo, create, markPaid, listMine, findOneMine };
};
