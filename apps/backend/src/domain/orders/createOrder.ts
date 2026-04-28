import type { Core } from '@strapi/strapi';
import { calculateOrderTotals } from './pricing';
import { generateOrderNumber } from './numbering';
import { CreateOrderInput, OrderValidationError } from './types';

export const createOrder = async (
  strapi: Core.Strapi,
  input: CreateOrderInput,
) => {
  if (!input.personalDataConsent) {
    throw new OrderValidationError(400, 'personalDataConsent must be true');
  }

  const totalQuantity = input.items.reduce((s, i) => s + i.quantity, 0);
  if (totalQuantity !== input.attendees.length) {
    throw new OrderValidationError(400, 'attendees.length must equal sum(items.quantity)');
  }
  if (totalQuantity < 1) {
    throw new OrderValidationError(400, 'order must contain at least one ticket');
  }

  return strapi.db.transaction(async () => {
    const event: any = await strapi.db.query('api::event.event').findOne({
      where: { id: input.eventId },
      populate: { tiers: true },
    });
    if (!event) {
      throw new OrderValidationError(404, 'event not found');
    }
    if (event.status !== 'published') {
      throw new OrderValidationError(400, 'event is not published');
    }
    if (!event.startsAt || new Date(event.startsAt).getTime() <= Date.now()) {
      throw new OrderValidationError(400, 'event already started or ended');
    }

    const tierMap = new Map<number, any>();
    for (const t of event.tiers || []) tierMap.set(t.id, t);

    for (const it of input.items) {
      const tier = tierMap.get(it.tierId);
      if (!tier) {
        throw new OrderValidationError(400, `tier ${it.tierId} does not belong to event`);
      }
      if (it.quantity < 1) {
        throw new OrderValidationError(400, 'item.quantity must be >= 1');
      }
    }

    if (event.capacity != null) {
      const issued: number = await strapi.db.query('api::ticket.ticket').count({
        where: { event: event.id, status: { $in: ['valid', 'used'] } },
      });
      if (issued + totalQuantity > event.capacity) {
        throw new OrderValidationError(409, 'event capacity exceeded');
      }
    }

    let promo: any = null;
    if (input.promoCode) {
      promo = await strapi.db.query('api::promo-code.promo-code').findOne({
        where: { code: input.promoCode.toUpperCase() },
        populate: { events: true },
      });
      if (!promo) {
        throw new OrderValidationError(400, 'invalid promo code');
      }
      const now = Date.now();
      if (promo.validFrom && new Date(promo.validFrom).getTime() > now) {
        throw new OrderValidationError(400, 'promo not yet valid');
      }
      if (promo.validUntil && new Date(promo.validUntil).getTime() < now) {
        throw new OrderValidationError(400, 'promo expired');
      }
      if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
        throw new OrderValidationError(400, 'promo usage limit reached');
      }
      const scoped = (promo.events || []).length > 0;
      if (scoped && !promo.events.some((e: any) => e.id === event.id)) {
        throw new OrderValidationError(400, 'promo not applicable to this event');
      }
    }

    const pricingItems = input.items.map((it) => {
      const tier = tierMap.get(it.tierId);
      return { unitPrice: tier.price, quantity: it.quantity };
    });
    const totals = calculateOrderTotals({
      items: pricingItems,
      promo: promo
        ? { discountType: promo.discountType, discountValue: promo.discountValue }
        : null,
    });

    const number = generateOrderNumber();

    const order: any = await strapi.db.query('api::order.order').create({
      data: {
        number,
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
        currency: 'RUB',
        paymentMethod: input.paymentMethod,
        paymentStatus: 'pending',
        personalDataConsentAt: new Date(),
        draftAttendees: input.attendees,
        user: input.userId,
        promoCode: promo ? promo.id : null,
      },
    });

    for (const it of input.items) {
      const tier = tierMap.get(it.tierId);
      await strapi.db.query('api::order-item.order-item').create({
        data: {
          quantity: it.quantity,
          unitPrice: tier.price,
          order: order.id,
          tier: tier.id,
        },
      });
    }

    return strapi.db.query('api::order.order').findOne({
      where: { id: order.id },
      populate: { items: true, promoCode: true },
    });
  });
};
