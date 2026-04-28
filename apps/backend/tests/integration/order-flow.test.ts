import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from '../helpers/strapi';
import { createOrder } from '../../src/domain/orders/createOrder';
import { markOrderPaid } from '../../src/domain/orders/markOrderPaid';

let strapi: Core.Strapi;

const setupFixtures = async () => {
  const venue: any = await strapi.db.query('api::venue.venue').create({
    data: { name: 'Test Hall', address: 'Moscow' },
  });
  const organizer: any = await strapi.db.query('api::organizer.organizer').create({
    data: { name: 'Test Org', publishedAt: new Date() },
  });
  const event: any = await strapi.db.query('api::event.event').create({
    data: {
      slug: `test-event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: 'Test Event',
      startsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      status: 'published',
      capacity: 100,
      venue: venue.id,
      organizer: organizer.id,
      publishedAt: new Date(),
    },
  });
  const tier: any = await strapi.db.query('api::ticket-tier.ticket-tier').create({
    data: { name: 'Standard', price: 10000, currency: 'RUB', event: event.id },
  });
  const role: any = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } });
  const user: any = await strapi.db.query('plugin::users-permissions.user').create({
    data: {
      username: `user-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      email: `u${Date.now()}${Math.floor(Math.random() * 1000)}@test.local`,
      provider: 'local',
      password: 'TestPass123!',
      confirmed: true,
      role: role?.id,
    },
  });
  return { event, tier, user };
};

beforeAll(async () => {
  process.env.TICKET_QR_SECRET = 'test-secret-32-bytes-minimum-length-ok';
  strapi = await setupStrapi();
}, 60000);

afterAll(async () => {
  await teardownStrapi();
});

describe('Order flow', () => {
  it('создаёт заказ и выпускает билеты при mark-paid', async () => {
    const { event, tier, user } = await setupFixtures();

    const order = await createOrder(strapi, {
      userId: user.id,
      eventId: event.id,
      items: [{ tierId: tier.id, quantity: 2 }],
      paymentMethod: 'card',
      personalDataConsent: true,
      attendees: [
        { fullName: 'Иванов И.И.', email: 'i@test.ru' },
        { fullName: 'Петров П.П.', email: 'p@test.ru' },
      ],
    });

    expect(order.paymentStatus).toBe('pending');
    expect(order.subtotal).toBe(20000);
    expect(order.total).toBe(20000);

    const paid: any = await markOrderPaid(strapi, {
      orderId: order.id,
      userId: user.id,
    });
    expect(paid.paymentStatus).toBe('paid');
    expect(paid.tickets.length).toBe(2);

    const tickets = await strapi.db.query('api::ticket.ticket').findMany({
      where: { order: order.id },
      populate: ['attendee'],
    });
    expect(tickets.length).toBe(2);
    expect(tickets.every((t: any) => t.status === 'valid')).toBe(true);
    expect(
      tickets.every((t: any) => typeof t.qrPayload === 'string' && t.qrPayload.length > 10),
    ).toBe(true);
    expect(tickets.map((t: any) => t.attendee?.fullName).sort()).toEqual([
      'Иванов И.И.',
      'Петров П.П.',
    ]);
  });

  it('400 при personalDataConsent=false', async () => {
    const { event, tier, user } = await setupFixtures();
    await expect(
      createOrder(strapi, {
        userId: user.id,
        eventId: event.id,
        items: [{ tierId: tier.id, quantity: 1 }],
        paymentMethod: 'card',
        personalDataConsent: false,
        attendees: [{ fullName: 'X' }],
      }),
    ).rejects.toMatchObject({ httpStatus: 400 });
  });

  it('400 при mismatch attendees vs items', async () => {
    const { event, tier, user } = await setupFixtures();
    await expect(
      createOrder(strapi, {
        userId: user.id,
        eventId: event.id,
        items: [{ tierId: tier.id, quantity: 2 }],
        paymentMethod: 'card',
        personalDataConsent: true,
        attendees: [{ fullName: 'X' }],
      }),
    ).rejects.toThrow('attendees.length must equal sum');
  });

  it('409 при capacity overflow', async () => {
    const { event, tier, user } = await setupFixtures();
    await strapi.db.query('api::event.event').update({
      where: { id: event.id },
      data: { capacity: 1 },
    });
    await expect(
      createOrder(strapi, {
        userId: user.id,
        eventId: event.id,
        items: [{ tierId: tier.id, quantity: 2 }],
        paymentMethod: 'card',
        personalDataConsent: true,
        attendees: [{ fullName: 'A' }, { fullName: 'B' }],
      }),
    ).rejects.toMatchObject({ httpStatus: 409 });
  });

  it('409 при повторной mark-paid', async () => {
    const { event, tier, user } = await setupFixtures();
    const order: any = await createOrder(strapi, {
      userId: user.id,
      eventId: event.id,
      items: [{ tierId: tier.id, quantity: 1 }],
      paymentMethod: 'card',
      personalDataConsent: true,
      attendees: [{ fullName: 'A' }],
    });
    await markOrderPaid(strapi, { orderId: order.id, userId: user.id });
    await expect(
      markOrderPaid(strapi, { orderId: order.id, userId: user.id }),
    ).rejects.toMatchObject({ httpStatus: 409 });
  });

  it('404 при mark-paid чужого заказа', async () => {
    const { event, tier, user } = await setupFixtures();
    const order: any = await createOrder(strapi, {
      userId: user.id,
      eventId: event.id,
      items: [{ tierId: tier.id, quantity: 1 }],
      paymentMethod: 'card',
      personalDataConsent: true,
      attendees: [{ fullName: 'A' }],
    });
    await expect(
      markOrderPaid(strapi, { orderId: order.id, userId: 999999 }),
    ).rejects.toMatchObject({ httpStatus: 404 });
  });
});
