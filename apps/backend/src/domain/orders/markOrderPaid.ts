import type { Core } from '@strapi/strapi';
import { generateTicketNumber } from './numbering';
import { signTicketQrPayload } from './qrPayload';
import { OrderValidationError } from './types';

export const markOrderPaid = async (
  strapi: Core.Strapi,
  params: { orderId: number; userId: number; paymentProviderId?: string },
) => {
  const secret = process.env.TICKET_QR_SECRET as string;

  return strapi.db.transaction(async () => {
    const order: any = await strapi.db.query('api::order.order').findOne({
      where: { id: params.orderId, user: params.userId },
      populate: {
        items: { populate: { tier: { populate: { event: true } } } },
        promoCode: true,
      },
    });
    if (!order) {
      throw new OrderValidationError(404, 'order not found');
    }
    if (order.paymentStatus !== 'pending') {
      throw new OrderValidationError(409, `order is ${order.paymentStatus}, expected pending`);
    }

    // Re-check: event ещё активен (не cancelled/archived) на момент оплаты.
    // Между createOrder и markOrderPaid админ мог снять мероприятие.
    for (const item of order.items || []) {
      const event = item.tier?.event;
      if (!event) continue;
      if (event.status === 'cancelled' || event.status === 'archived') {
        throw new OrderValidationError(
          409,
          `event is ${event.status}, cannot issue tickets`,
        );
      }
    }

    const draft: any[] = order.draftAttendees || [];
    let attendeeIdx = 0;
    const createdTickets: any[] = [];

    for (const item of order.items || []) {
      const tier = item.tier;
      const event = tier?.event;
      if (!tier || !event) {
        throw new Error('order-item missing tier or event');
      }
      for (let i = 0; i < item.quantity; i += 1) {
        const attendee = draft[attendeeIdx];
        if (!attendee) {
          throw new Error('draftAttendees length mismatch');
        }
        attendeeIdx += 1;

        const number = generateTicketNumber();
        // Use entityService (not db.query) so the `attendee` component is
        // persisted correctly — db.query bypasses Strapi's component layer.
        const ticket: any = await strapi.entityService.create('api::ticket.ticket', {
          data: {
            number,
            qrPayload: 'pending',
            status: 'valid',
            attendee,
            order: order.id,
            tier: tier.id,
            event: event.id,
          },
        });

        const qrPayload = signTicketQrPayload(
          { ticketId: ticket.id, eventId: event.id, number },
          secret,
        );
        await strapi.db.query('api::ticket.ticket').update({
          where: { id: ticket.id },
          data: { qrPayload },
        });
        createdTickets.push({ ...ticket, qrPayload });
      }
    }

    await strapi.db.query('api::order.order').update({
      where: { id: order.id },
      data: {
        paymentStatus: 'paid',
        paymentProviderId: params.paymentProviderId || 'dev:mark-paid',
        draftAttendees: null,
      },
    });

    if (order.promoCode) {
      // Re-check внутри транзакции: между createOrder и markOrderPaid
      // мог произойти параллельный paid того же промо. Атомарно читаем
      // текущий usedCount и инкрементируем.
      // TODO: полное решение — SELECT FOR UPDATE или Redis sequence
      // (сейчас остаётся узкое окно гонки при высоком concurrency).
      const fresh: any = await strapi.db.query('api::promo-code.promo-code').findOne({
        where: { id: order.promoCode.id },
      });
      if (fresh?.maxUses != null && (fresh.usedCount || 0) >= fresh.maxUses) {
        throw new OrderValidationError(
          409,
          'promo usage limit reached during payment',
        );
      }
      await strapi.db.query('api::promo-code.promo-code').update({
        where: { id: order.promoCode.id },
        data: { usedCount: (fresh?.usedCount || 0) + 1 },
      });
    }

    return strapi.db.query('api::order.order').findOne({
      where: { id: order.id },
      populate: { items: true, tickets: true },
    });
  });
};
