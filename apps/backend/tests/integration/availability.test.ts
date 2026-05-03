import { setupStrapi, teardownStrapi } from '../helpers/strapi';
import request from 'supertest';
import type { Core } from '@strapi/strapi';

let strapi: Core.Strapi;

describe('Event availability API', () => {
  beforeAll(async () => {
    strapi = await setupStrapi();
  }, 60000);

  afterAll(async () => {
    await teardownStrapi();
  });

  it('GET /api/events/:slug/availability возвращает capacity, sold, remaining', async () => {
    const slug = `avail-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const event = await strapi.documents('api::event.event').create({
      data: {
        title: 'Avail Test',
        slug,
        startsAt: new Date().toISOString(),
        capacity: 10,
        status: 'published',
      },
      status: 'published',
    });

    const res = await request(strapi.server.httpServer).get(`/api/events/${event.slug}/availability`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ capacity: 10, sold: 0, remaining: 10 });
  });

  it('считает только tickets со status valid|used', async () => {
    const slug = `avail-sold-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const event = await strapi.documents('api::event.event').create({
      data: {
        title: 'Avail Sold',
        slug,
        startsAt: new Date().toISOString(),
        capacity: 5,
        status: 'published',
      },
      status: 'published',
    });
    const tier = await strapi.documents('api::ticket-tier.ticket-tier').create({
      data: { name: 'Стандарт', price: 100, currency: 'RUB', event: event.documentId },
    });

    // 2 valid, 1 used, 1 cancelled, 1 refunded → sold = 3
    const statuses = ['valid', 'valid', 'used', 'cancelled', 'refunded'] as const;
    for (let i = 0; i < statuses.length; i++) {
      const uniq = `${slug}-${i}`;
      await strapi.documents('api::ticket.ticket').create({
        data: {
          number: `T-AVAIL-${uniq}`,
          qrPayload: `qr-${uniq}`,
          status: statuses[i],
          attendee: { fullName: 'Гость', email: 'g@example.com' },
          event: event.documentId,
          tier: tier.documentId,
        },
      });
    }

    const res = await request(strapi.server.httpServer).get(`/api/events/${event.slug}/availability`);
    expect(res.body.data).toEqual({ capacity: 5, sold: 3, remaining: 2 });
  });

  it('возвращает 404 для несуществующего slug', async () => {
    const res = await request(strapi.server.httpServer).get('/api/events/nonexistent-slug-xyz/availability');
    expect(res.status).toBe(404);
  });
});
