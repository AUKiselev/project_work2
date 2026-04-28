import type { Core } from '@strapi/strapi';
import request from 'supertest';
import { setupStrapi, teardownStrapi } from '../helpers/strapi';
import { issueAccessToken } from '../helpers/auth';
import { createOrder } from '../../src/domain/orders/createOrder';
import { markOrderPaid } from '../../src/domain/orders/markOrderPaid';

let strapi: Core.Strapi;

beforeAll(async () => {
  process.env.TICKET_QR_SECRET = 'test-secret-32-bytes-minimum-length-ok';
  strapi = await setupStrapi();
}, 60000);

afterAll(async () => {
  await teardownStrapi();
});

describe('ticket ownership', () => {
  it('билет не виден чужому пользователю по фильтру order.user', async () => {
    const role: any = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'authenticated' } });

    const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const userA: any = await strapi.db.query('plugin::users-permissions.user').create({
      data: {
        username: `a-${ts}`,
        email: `a${ts}@t.l`,
        provider: 'local',
        password: 'P!1abcdef',
        confirmed: true,
        role: role?.id,
      },
    });
    const userB: any = await strapi.db.query('plugin::users-permissions.user').create({
      data: {
        username: `b-${ts}`,
        email: `b${ts}@t.l`,
        provider: 'local',
        password: 'P!1abcdef',
        confirmed: true,
        role: role?.id,
      },
    });
    const event: any = await strapi.db.query('api::event.event').create({
      data: {
        slug: `own-ev-${ts}`,
        title: 'Own',
        startsAt: new Date(Date.now() + 86400000),
        status: 'published',
        publishedAt: new Date(),
      },
    });
    const tier: any = await strapi.db.query('api::ticket-tier.ticket-tier').create({
      data: { name: 'Std', price: 100, currency: 'RUB', event: event.id },
    });

    const order: any = await createOrder(strapi, {
      userId: userA.id,
      eventId: event.id,
      items: [{ tierId: tier.id, quantity: 1 }],
      paymentMethod: 'card',
      personalDataConsent: true,
      attendees: [{ fullName: 'A' }],
    });
    await markOrderPaid(strapi, { orderId: order.id, userId: userA.id });

    const aTickets = await strapi.db.query('api::ticket.ticket').findMany({
      where: { order: { user: userA.id } },
    });
    const bTickets = await strapi.db.query('api::ticket.ticket').findMany({
      where: { order: { user: userB.id } },
    });
    expect(aTickets.length).toBe(1);
    expect(bTickets.length).toBe(0);
  });

  it('qrPayload отдаётся в /me/tickets/:id владельцу, но не в /me/tickets (списке)', async () => {
    const role: any = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'authenticated' } });
    const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const user: any = await strapi.db.query('plugin::users-permissions.user').create({
      data: { username: `qr-${ts}`, email: `qr${ts}@t.l`, provider: 'local', password: 'P!1abcdef', confirmed: true, role: role?.id },
    });
    const event: any = await strapi.db.query('api::event.event').create({
      data: { slug: `qr-ev-${ts}`, title: 'QR', startsAt: new Date(Date.now() + 86400000), status: 'published', publishedAt: new Date() },
    });
    const tier: any = await strapi.db.query('api::ticket-tier.ticket-tier').create({
      data: { name: 'Std', price: 100, currency: 'RUB', event: event.id },
    });
    const order: any = await createOrder(strapi, {
      userId: user.id, eventId: event.id,
      items: [{ tierId: tier.id, quantity: 1 }],
      paymentMethod: 'card', personalDataConsent: true,
      attendees: [{ fullName: 'A' }],
    });
    await markOrderPaid(strapi, { orderId: order.id, userId: user.id });

    const token = await issueAccessToken(strapi, user.id);

    // List (me/tickets) — qrPayload не должен присутствовать
    const list = await request(strapi.server.httpServer)
      .get('/api/me/tickets')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.data.length).toBeGreaterThan(0);
    for (const t of list.body.data) {
      expect(t.qrPayload).toBeUndefined();
    }

    // Detail (me/tickets/:id) — qrPayload должен быть
    const ticketId = list.body.data[0].id;
    const detail = await request(strapi.server.httpServer)
      .get(`/api/me/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(typeof detail.body.data.qrPayload).toBe('string');
    expect(detail.body.data.qrPayload.length).toBeGreaterThan(10);
    // attendee.email/phone не содержат реальных значений (Fix 1 — только fullName).
    // Strapi может включить поля компонента как null при сериализации — это
    // допустимо. Главное — реальный email/phone не просачивается.
    expect(detail.body.data.attendee?.email || null).toBeNull();
    expect(detail.body.data.attendee?.phone || null).toBeNull();
    expect(detail.body.data.attendee?.fullName).toBe('A');
  });
});
