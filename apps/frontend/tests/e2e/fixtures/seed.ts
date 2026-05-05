import type { APIRequestContext } from '@playwright/test';

const API_BASE = process.env.PLAYWRIGHT_API_BASE || 'http://api.localhost';
const TOKEN = process.env.STRAPI_API_TOKEN;
const SLUG = 'e2e-conf-2026';

export async function seedEvent(req: APIRequestContext) {
  if (!TOKEN) throw new Error('STRAPI_API_TOKEN env required for e2e');
  const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

  // Проверяем — уже есть?
  const check = await req.get(`${API_BASE}/api/events?filters[slug][$eq]=${SLUG}`, { headers });
  const checkJson = await check.json();
  if (checkJson?.data?.length) return checkJson.data[0];

  // Venue.
  const venueRes = await req.post(`${API_BASE}/api/venues`, {
    headers, data: { data: { name: 'E2E Hall', address: 'Москва, Тверская 1' } },
  });
  const venue = (await venueRes.json()).data;

  // Event.
  const startsAt = new Date(Date.now() + 14 * 86400000).toISOString();
  const eventRes = await req.post(`${API_BASE}/api/events`, {
    headers,
    data: { data: {
      slug: SLUG,
      title: 'E2E конференция 2026',
      shortDescription: 'Тестовое мероприятие',
      description: '<p>Описание e2e</p>',
      startsAt,
      timezone: 'Europe/Moscow',
      status: 'published',
      venue: venue.id,
      publishedAt: new Date().toISOString(),
    } },
  });
  const event = (await eventRes.json()).data;

  // Tier.
  await req.post(`${API_BASE}/api/ticket-tiers`, {
    headers,
    data: { data: {
      name: 'Standard',
      description: 'Обычный билет',
      includes: '<p>Доступ ко всем секциям</p>',
      price: 100000,
      currency: 'RUB',
      sortOrder: 0,
      event: event.id,
    } },
  });

  return event;
}
