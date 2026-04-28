import { factories } from '@strapi/strapi';
import { createOrder } from '../../../domain/orders/createOrder';
import { markOrderPaid } from '../../../domain/orders/markOrderPaid';
import { calculateOrderTotals } from '../../../domain/orders/pricing';
import { OrderValidationError } from '../../../domain/orders/types';

const handleDomainError = (ctx: any, err: unknown) => {
  if (err instanceof OrderValidationError) {
    ctx.status = err.httpStatus;
    ctx.body = { error: { status: err.httpStatus, message: err.message } };
    return true;
  }
  return false;
};

export default factories.createCoreController('api::order.order', ({ strapi }) => ({
  async create(ctx: any) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();

    const body = ctx.request.body || {};
    try {
      const order = await createOrder(strapi, {
        userId,
        eventId: Number(body.eventId),
        items: Array.isArray(body.items) ? body.items : [],
        promoCode: body.promoCode || null,
        paymentMethod: body.paymentMethod,
        personalDataConsent: body.personalDataConsent === true,
        attendees: Array.isArray(body.attendees) ? body.attendees : [],
      });

      const sanitized = await this.sanitizeOutput(order, ctx);
      ctx.body = { data: sanitized };
    } catch (err) {
      if (handleDomainError(ctx, err)) return;
      throw err;
    }
  },

  async previewPromo(ctx: any) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();

    const body = ctx.request.body || {};
    const eventId = Number(body.eventId);
    const items = Array.isArray(body.items) ? body.items : [];
    const code = body.promoCode ? String(body.promoCode).toUpperCase() : null;

    const event: any = await strapi.db.query('api::event.event').findOne({
      where: { id: eventId },
      populate: { tiers: true },
    });
    if (!event) return ctx.badRequest('event not found');

    const tierMap = new Map<number, any>();
    for (const t of event.tiers || []) tierMap.set(t.id, t);

    const pricingItems: Array<{ unitPrice: number; quantity: number }> = [];
    for (const it of items) {
      const tier = tierMap.get(Number(it.tierId));
      if (!tier) return ctx.badRequest(`tier ${it.tierId} not in event`);
      pricingItems.push({ unitPrice: tier.price, quantity: Number(it.quantity) });
    }

    let promo: any = null;
    let reason: string | null = null;
    if (code) {
      promo = await strapi.db.query('api::promo-code.promo-code').findOne({
        where: { code },
        populate: { events: true },
      });
      if (!promo) reason = 'invalid';
      else {
        const now = Date.now();
        if (promo.validFrom && new Date(promo.validFrom).getTime() > now) reason = 'not_yet_valid';
        else if (promo.validUntil && new Date(promo.validUntil).getTime() < now) reason = 'expired';
        else if (promo.maxUses != null && promo.usedCount >= promo.maxUses) reason = 'limit_reached';
        else {
          const scoped = (promo.events || []).length > 0;
          if (scoped && !promo.events.some((e: any) => e.id === event.id)) reason = 'wrong_event';
        }
      }
    }

    const totals = calculateOrderTotals({
      items: pricingItems,
      promo: !reason && promo
        ? { discountType: promo.discountType, discountValue: promo.discountValue }
        : null,
    });

    ctx.body = {
      data: {
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
        applied: totals.appliedPromo,
        reason,
      },
    };
  },

  async markPaid(ctx: any) {
    if (process.env.NODE_ENV === 'production') return ctx.notFound();
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();
    const orderId = Number(ctx.params.id);

    try {
      const order = await markOrderPaid(strapi, { orderId, userId });
      const sanitized = await this.sanitizeOutput(order, ctx);
      ctx.body = { data: sanitized };
    } catch (err) {
      if (handleDomainError(ctx, err)) return;
      throw err;
    }
  },

  async findMine(ctx: any) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();

    const orders = await strapi.db.query('api::order.order').findMany({
      where: { user: userId },
      populate: { items: { populate: { tier: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const sanitized = await this.sanitizeOutput(orders, ctx);
    ctx.body = { data: sanitized };
  },

  async findOneMine(ctx: any) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();
    const id = Number(ctx.params.id);

    const order = await strapi.db.query('api::order.order').findOne({
      where: { id, user: userId },
      populate: { items: { populate: { tier: true } }, tickets: true },
    });
    if (!order) return ctx.notFound();
    const sanitized = await this.sanitizeOutput(order, ctx);
    ctx.body = { data: sanitized };
  },
}));
