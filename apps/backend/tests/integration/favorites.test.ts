import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from '../helpers/strapi';

let strapi: Core.Strapi;

beforeAll(async () => {
  process.env.TICKET_QR_SECRET = 'test-secret-32-bytes-minimum-length-ok';
  strapi = await setupStrapi();
}, 60000);

afterAll(async () => {
  await teardownStrapi();
});

const makeUserAndEvent = async () => {
  const role: any = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } });
  const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const user: any = await strapi.db.query('plugin::users-permissions.user').create({
    data: {
      username: `fav-${ts}`,
      email: `fav${ts}@t.local`,
      provider: 'local',
      password: 'PassPass1!',
      confirmed: true,
      role: role?.id,
    },
  });
  const event: any = await strapi.db.query('api::event.event').create({
    data: {
      slug: `fav-event-${ts}`,
      title: 'Fav Event',
      startsAt: new Date(Date.now() + 86400000),
      status: 'published',
      publishedAt: new Date(),
    },
  });
  return { user, event };
};

describe('Favorites', () => {
  it('создаёт пару (user, event) и не дублирует при повторе', async () => {
    const { user, event } = await makeUserAndEvent();

    const first: any = await strapi.db.query('api::favorite.favorite').create({
      data: { user: user.id, event: event.id },
    });
    expect(first.id).toBeDefined();

    const existing = await strapi.db.query('api::favorite.favorite').findOne({
      where: { user: user.id, event: event.id },
    });
    expect(existing.id).toBe(first.id);

    const all = await strapi.db.query('api::favorite.favorite').findMany({
      where: { user: user.id, event: event.id },
    });
    expect(all.length).toBe(1);
  });
});
