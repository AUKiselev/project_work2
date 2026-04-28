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
      await strapi.db.query('api::promo-code.promo-code').update({
        where: { id: order.promoCode.id },
        data: { usedCount: (order.promoCode.usedCount || 0) + 1 },
      });
    }

    return strapi.db.query('api::order.order').findOne({
      where: { id: order.id },
      populate: { items: true, tickets: true },
    });
  });
};
