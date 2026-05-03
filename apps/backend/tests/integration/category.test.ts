import type { Core } from '@strapi/strapi';
import request from 'supertest';
import { setupStrapi, teardownStrapi } from '../helpers/strapi';

let strapi: Core.Strapi;

beforeAll(async () => {
  process.env.TICKET_QR_SECRET = 'test-secret-32-bytes-minimum-length-ok';
  strapi = await setupStrapi();
}, 60000);

afterAll(async () => {
  await teardownStrapi();
});

describe('Category public API', () => {
  it('GET /api/categories возвращает 200 анонимно', async () => {
    const res = await request(strapi.server.httpServer).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('создаёт категорию через Document Service и возвращает по documentId', async () => {
    const slug = `test-cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const created = await strapi.documents('api::category.category').create({
      data: { title: 'Test Cat', slug, colorToken: 'sky' },
    });
    expect(created.documentId).toBeDefined();

    const res = await request(strapi.server.httpServer).get(
      `/api/categories/${created.documentId}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Test Cat');
    expect(res.body.data.colorToken).toBe('sky');
  });
});
