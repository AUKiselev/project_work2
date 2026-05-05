# Prototype Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести функциональный прототип к более реалистичному виду приложения: одна кнопка «Войти» вместо двух, footer с info-страницами, обогащённые EventCard (категория/площадка/остаток мест), фоновые декоративные блобы и SVG empty-states.

**Architecture:** Hybrid — новые переиспользуемые компоненты только там где имеет смысл (CategoryBadge, AvailabilityBadge, AppFooter, AppDecorBackground, EmptyIllustration), декор встраивается в layouts. Backend получает новый content-type `Category`, расширяется `Event` и появляется кастомный endpoint `/events/:slug/availability`, считающий проданные билеты через агрегацию `Ticket` со `status IN ('valid','used')`. Никаких анимаций.

**Tech Stack:** Strapi 5 + TypeScript + PostgreSQL · Nuxt 4 + Nuxt UI v4 + Pinia + Tailwind · Jest (backend integration), Vitest (frontend unit), Playwright (e2e).

**Spec:** [docs/superpowers/specs/2026-05-03-prototype-polish-design.md](../specs/2026-05-03-prototype-polish-design.md)

---

## File Structure

### Backend — `apps/backend/`

**Создаётся:**
- `src/api/category/content-types/category/schema.json` — схема Category.
- `src/api/category/controllers/category.ts` — стандартный core controller.
- `src/api/category/routes/category.ts` — стандартный core router.
- `src/api/category/services/category.ts` — стандартный core service.
- `tests/integration/category.test.ts` — public access GET /api/categories.
- `tests/integration/availability.test.ts` — корректность remaining = capacity - sold.

**Модифицируется:**
- `src/api/event/content-types/event/schema.json` — добавить relation `category`.
- `src/api/event/controllers/event.ts` — populate `category` в `findBySlug` и `search`; новый метод `availability`.
- `src/api/event/routes/event.ts` — новый route GET `/events/:slug/availability`.
- `src/index.ts` — расширить `PUBLIC_ACTIONS` записями `category.find`, `category.findOne`, `event.availability`.
- `src/seed/dev-seed.ts` — раздел Categories (4 шт) + связь events↔category + раздел Mock Tickets (~30 + ~85, идемпотентно по `number`).

### Frontend — `apps/frontend/`

**Создаётся:**
- `app/components/AppDecorBackground.vue` — slot-обёртка с blur-блобами.
- `app/components/AppFooter.vue` — desktop-only footer.
- `app/components/CategoryBadge.vue` — pill-бейдж категории.
- `app/components/AvailabilityBadge.vue` — бейдж остатка мест с пороговой логикой.
- `app/components/EmptyIllustration.vue` — switch-case по `name` → inline SVG.
- `app/composables/useEventAvailability.ts` — fetch + кэш availability по slug.
- `app/pages/info/about.vue` — «О платформе».
- `app/pages/info/contacts.vue` — контакты + анонимная форма обратной связи.
- `app/pages/info/terms.vue` — пользовательское соглашение.
- `app/pages/info/offer.vue` — публичная оферта.
- `tests/unit/components/CategoryBadge.spec.ts`
- `tests/unit/components/AvailabilityBadge.spec.ts`
- `tests/unit/components/EmptyIllustration.spec.ts`
- `tests/unit/components/AppFooter.spec.ts`
- `tests/unit/composables/useEventAvailability.spec.ts`
- `tests/e2e/polish-smoke.spec.ts` — навигация по footer, объединение auth-кнопок.

**Модифицируется:**
- `app/components/AppTopNav.vue` — две auth-ссылки → одна `<UButton to="/login">Войти</UButton>`.
- `app/pages/login.vue` — добавить блок «Создать аккаунт» под формой.
- `app/components/EventCard.vue` — CategoryBadge + AvailabilityBadge + venue-name.
- `app/components/EventCardCompact.vue` — CategoryBadge.
- `app/components/EventHero.vue` — CategoryBadge + AvailabilityBadge в overlay.
- `app/components/AppEmpty.vue` — EmptyIllustration вместо иконки (icon как fallback).
- `app/layouts/default.vue` — подключить AppFooter.
- `app/layouts/auth.vue` — обернуть slot в AppDecorBackground.
- `app/pages/account/become-speaker.vue` — обернуть в AppDecorBackground.
- `app/pages/account/contact-manager.vue` — обернуть в AppDecorBackground.

---

## Этап 1 — Backend: Category content-type

### Task 1.1: Создать Category content-type

**Files:**
- Create: `apps/backend/src/api/category/content-types/category/schema.json`
- Create: `apps/backend/src/api/category/controllers/category.ts`
- Create: `apps/backend/src/api/category/routes/category.ts`
- Create: `apps/backend/src/api/category/services/category.ts`

- [ ] **Step 1: Создать schema.json**

Файл `apps/backend/src/api/category/content-types/category/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "categories",
  "info": {
    "singularName": "category",
    "pluralName": "categories",
    "displayName": "Category",
    "description": "Категория мероприятия"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "slug": { "type": "uid", "targetField": "title", "required": true },
    "title": { "type": "string", "required": true, "maxLength": 80 },
    "colorToken": {
      "type": "enumeration",
      "enum": ["primary", "sky", "emerald", "amber", "rose", "violet"],
      "default": "primary",
      "required": true
    },
    "description": { "type": "text", "required": false }
  }
}
```

- [ ] **Step 2: Создать стандартные controller/route/service**

Файл `apps/backend/src/api/category/controllers/category.ts`:

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::category.category');
```

Файл `apps/backend/src/api/category/routes/category.ts`:

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::category.category');
```

Файл `apps/backend/src/api/category/services/category.ts`:

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::category.category');
```

- [ ] **Step 3: Расширить PUBLIC_ACTIONS**

В `apps/backend/src/index.ts` найти массив `PUBLIC_ACTIONS` и добавить две записи перед `'api::banner.banner.find'`:

```ts
'api::category.category.find',
'api::category.category.findOne',
```

- [ ] **Step 4: Перезапустить backend и проверить boot**

```bash
docker restart project_work2-backend-1
docker logs project_work2-backend-1 --tail 30
```

Expected: в логах видна строка `Server listening on 0.0.0.0:1337`, без `error` / `Schema validation failed`.

- [ ] **Step 5: Коммит**

```bash
git add apps/backend/src/api/category apps/backend/src/index.ts
git commit -m "feat(backend): добавить content-type Category"
```

---

### Task 1.2: Integration test — GET /api/categories доступен публично

**Files:**
- Create: `apps/backend/tests/integration/category.test.ts`

- [ ] **Step 1: Написать failing-тест**

Изучить существующий integration test для образца — `apps/backend/tests/integration/` (например, `event.test.ts` если есть; иначе `helpers/`). Скопировать setup.

Создать `apps/backend/tests/integration/category.test.ts`:

```ts
import { setupStrapi, teardownStrapi } from '../helpers/strapi';
import request from 'supertest';

describe('Category public API', () => {
  beforeAll(async () => {
    await setupStrapi();
  });

  afterAll(async () => {
    await teardownStrapi();
  });

  it('GET /api/categories возвращает 200 анонимно', async () => {
    const res = await request(strapi.server.httpServer).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('создаёт и возвращает категорию по slug', async () => {
    const created = await strapi.documents('api::category.category').create({
      data: { title: 'Test Cat', slug: 'test-cat', colorToken: 'sky' },
    });
    const res = await request(strapi.server.httpServer).get(`/api/categories/${created.documentId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Test Cat');
    expect(res.body.data.colorToken).toBe('sky');
  });
});
```

> **Если** `apps/backend/tests/helpers/strapi.ts` не существует или имеет другую сигнатуру — открыть его и адаптировать импорты под фактическую API. Если в проекте есть `tests/integration/session.test.ts` или подобный — использовать его как образец setup/teardown.

- [ ] **Step 2: Запустить тест и убедиться что падает (если PUBLIC_ACTIONS не применяется)**

```bash
docker exec project_work2-backend-1 npm run test:integration -- --testPathPatterns=category
```

Expected (если что-то забыли): FAIL на статус 403/401 либо PASS если всё уже корректно.

Если PASS на первой попытке — это OK для интеграции (категории уже работают). Перейти к Step 4.

- [ ] **Step 3: Если падает — диагностировать**

Возможные причины:
- `PUBLIC_ACTIONS` не добавлены — проверить шаг 1.3 ещё раз.
- Bootstrap не пересоздал permissions — `docker restart project_work2-backend-1` и повторить.

- [ ] **Step 4: Запустить полный suite чтобы убедиться что не сломали другие тесты**

```bash
docker exec project_work2-backend-1 npm run test:integration
```

Expected: все тесты PASS.

- [ ] **Step 5: Коммит**

```bash
git add apps/backend/tests/integration/category.test.ts
git commit -m "test(backend): integration-тест публичного доступа к Category"
```

---

### Task 1.3: Связать Event ↔ Category

**Files:**
- Modify: `apps/backend/src/api/event/content-types/event/schema.json`
- Modify: `apps/backend/src/api/event/controllers/event.ts`

- [ ] **Step 1: Добавить relation в Event schema**

Открыть `apps/backend/src/api/event/content-types/event/schema.json`. Найти конец блока `attributes` (после `tiers`). Перед закрывающей `}` добавить:

```json
,
"category": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "api::category.category"
}
```

- [ ] **Step 2: Расширить populate в controllers/event.ts**

В `apps/backend/src/api/event/controllers/event.ts`:

В методе `search` найти `populate: { coverImage: true, venue: true, tiers: true }` → заменить на:

```ts
populate: { coverImage: true, venue: true, tiers: true, category: true }
```

В методе `findBySlug` найти блок `populate: { ... tiers: true }` → перед закрывающей `}` добавить `, category: true`. Итог:

```ts
populate: {
  coverImage: true,
  gallery: true,
  pastGallery: true,
  venue: true,
  organizer: { populate: { logo: true } },
  agenda: { populate: { speakers: { populate: { photo: true } } } },
  speakers: { populate: { photo: true } },
  tiers: true,
  category: true,
},
```

- [ ] **Step 3: Перезапустить backend, проверить boot**

```bash
docker restart project_work2-backend-1
docker logs project_work2-backend-1 --tail 30
```

Expected: `Server listening`, без schema-ошибок.

- [ ] **Step 4: Smoke — populate на главной возвращает поле category (пустое)**

```bash
curl -sS --globoff 'http://api.localhost/api/events?populate[0]=category'
```

Expected: ответ 200, в каждом event'е есть поле `"category": null` (категории ещё не привязаны, но поле должно прийти).

- [ ] **Step 5: Коммит**

```bash
git add apps/backend/src/api/event
git commit -m "feat(backend): связать Event с Category"
```

---

## Этап 2 — Backend: availability endpoint

### Task 2.1: TDD — controller-метод `availability`

**Files:**
- Modify: `apps/backend/src/api/event/controllers/event.ts`
- Modify: `apps/backend/src/api/event/routes/event.ts`
- Modify: `apps/backend/src/index.ts`
- Create: `apps/backend/tests/integration/availability.test.ts`

- [ ] **Step 1: Написать failing-тест**

Создать `apps/backend/tests/integration/availability.test.ts`:

```ts
import { setupStrapi, teardownStrapi } from '../helpers/strapi';
import request from 'supertest';

describe('Event availability API', () => {
  beforeAll(async () => {
    await setupStrapi();
  });

  afterAll(async () => {
    await teardownStrapi();
  });

  it('GET /api/events/:slug/availability возвращает capacity, sold, remaining', async () => {
    const event = await strapi.documents('api::event.event').create({
      data: {
        title: 'Avail Test',
        slug: 'avail-test',
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
    const event = await strapi.documents('api::event.event').create({
      data: {
        title: 'Avail Sold',
        slug: 'avail-sold',
        startsAt: new Date().toISOString(),
        capacity: 5,
        status: 'published',
      },
      status: 'published',
    });
    const tier = await strapi.documents('api::ticket-tier.ticket-tier').create({
      data: { name: 'Стандарт', price: 100, event: event.documentId },
    });

    // 2 valid, 1 used, 1 cancelled, 1 refunded → sold = 3
    const statuses = ['valid', 'valid', 'used', 'cancelled', 'refunded'] as const;
    for (let i = 0; i < statuses.length; i++) {
      await strapi.documents('api::ticket.ticket').create({
        data: {
          number: `T-AVAIL-${i}`,
          qrPayload: `qr-${i}`,
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
    const res = await request(strapi.server.httpServer).get('/api/events/nonexistent/availability');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Запустить тест — должен падать (404 на endpoint)**

```bash
docker exec project_work2-backend-1 npm run test:integration -- --testPathPatterns=availability
```

Expected: FAIL на 404 / route not found.

- [ ] **Step 3: Добавить route**

В `apps/backend/src/api/event/routes/event.ts` в массив `routes` добавить (после `findOne`):

```ts
{
  method: 'GET',
  path: '/events/:slug/availability',
  handler: 'api::event.event.availability',
},
```

- [ ] **Step 4: Реализовать controller-метод**

В `apps/backend/src/api/event/controllers/event.ts` после метода `findBySlug` (перед закрывающей `}));`) добавить:

```ts
async availability(ctx: any) {
  const slug = String(ctx.params.slug);
  const event = await strapi.documents('api::event.event').findFirst({
    filters: { slug, publishedAt: { $notNull: true } },
  });
  if (!event) return ctx.notFound();

  const sold = await strapi.db.query('api::ticket.ticket').count({
    where: {
      event: { documentId: event.documentId },
      status: { $in: ['valid', 'used'] },
    },
  });

  const capacity = event.capacity ?? 0;
  ctx.body = { data: { capacity, sold, remaining: Math.max(0, capacity - sold) } };
},
```

- [ ] **Step 5: Расширить PUBLIC_ACTIONS**

В `apps/backend/src/index.ts` в `PUBLIC_ACTIONS` после `'api::event.event.findOne'` добавить:

```ts
'api::event.event.availability',
```

- [ ] **Step 6: Перезапустить backend и прогнать тесты**

```bash
docker restart project_work2-backend-1
docker exec project_work2-backend-1 npm run test:integration -- --testPathPatterns=availability
```

Expected: все 3 теста PASS.

- [ ] **Step 7: Smoke вручную**

```bash
curl -sS 'http://api.localhost/api/events/tech-meetup-spring-2026/availability'
```

Expected: 200 + JSON `{ data: { capacity: 100, sold: 0, remaining: 100 } }` (билетов пока нет).

- [ ] **Step 8: Коммит**

```bash
git add apps/backend/src/api/event apps/backend/src/index.ts apps/backend/tests/integration/availability.test.ts
git commit -m "feat(backend): добавить эндпоинт availability с агрегацией tickets"
```

---

## Этап 3 — Backend: сидер (категории + mock-tickets)

### Task 3.1: Сидер — раздел Categories

**Files:**
- Modify: `apps/backend/src/seed/dev-seed.ts`

- [ ] **Step 1: Найти точку вставки**

Открыть `apps/backend/src/seed/dev-seed.ts`. Найти место где создаются другие сущности (например, Venues или Organizers) — перенять их паттерн (idempotency через findFirst + skip-or-create + лог).

- [ ] **Step 2: Добавить раздел Categories**

После раздела Venues (или в самом начале сидера, до events) добавить:

```ts
// === Categories ===
const CATEGORY_SEEDS = [
  { slug: 'meetup', title: 'Митап', colorToken: 'sky' as const },
  { slug: 'conference', title: 'Конференция', colorToken: 'primary' as const },
  { slug: 'workshop', title: 'Воркшоп', colorToken: 'emerald' as const },
  { slug: 'lecture', title: 'Лекция', colorToken: 'violet' as const },
];

const categoriesBySlug: Record<string, { documentId: string }> = {};
for (const seed of CATEGORY_SEEDS) {
  const existing = await strapi.documents('api::category.category').findFirst({
    filters: { slug: seed.slug },
  });
  if (existing) {
    strapi.log.info(`[seed] category ${seed.slug} skipped (exists)`);
    categoriesBySlug[seed.slug] = { documentId: existing.documentId };
    continue;
  }
  const created = await strapi.documents('api::category.category').create({
    data: seed,
  });
  strapi.log.info(`[seed] category ${seed.slug} created`);
  categoriesBySlug[seed.slug] = { documentId: created.documentId };
}
```

- [ ] **Step 3: Привязать существующие events к категориям**

Найти в сидере места создания/обновления событий. Для tech-meetup-spring-2026 в data добавить `category: categoriesBySlug.meetup.documentId`. Для product-conference-2026 — `category: categoriesBySlug.conference.documentId`.

> Если события создаются через помощник вроде `upsertEvent({ slug, ...data, category })` — добавить в опции и пробросить.
> Если используется branch «existing → skip» — добавить логику: если у существующего event'а нет category, обновить через `strapi.documents('api::event.event').update({ documentId, data: { category } })`. Это нужно потому что после первого запуска без категорий events уже созданы и их нужно «дозаполнить».

- [ ] **Step 4: Запустить сидер дважды, проверить идемпотентность**

```bash
docker restart project_work2-backend-1
sleep 5
docker logs project_work2-backend-1 --tail 50 | grep "\[seed\] category"
docker restart project_work2-backend-1
sleep 5
docker logs project_work2-backend-1 --tail 50 | grep "\[seed\] category"
```

Expected: первый запуск — 4 «created», второй — 4 «skipped (exists)».

- [ ] **Step 5: Проверить что events теперь привязаны**

```bash
curl -sS --globoff 'http://api.localhost/api/events?populate[0]=category' | python -c "import sys,json; d=json.load(sys.stdin); [print(e['slug'],'->',(e.get('category') or {}).get('title','None')) for e in d['data']]"
```

Expected: `tech-meetup-spring-2026 -> Митап`, `product-conference-2026 -> Конференция`.

- [ ] **Step 6: Коммит**

```bash
git add apps/backend/src/seed/dev-seed.ts
git commit -m "feat(backend): добавить категории мероприятий в dev-seed"
```

---

### Task 3.2: Сидер — mock-tickets для availability

**Files:**
- Modify: `apps/backend/src/seed/dev-seed.ts`

- [ ] **Step 1: Добавить раздел Mock Tickets**

В конец сидера (после agenda, после tickets-related блоков если есть) добавить:

```ts
// === Mock Tickets (для AvailabilityBadge) ===
const MOCK_TICKETS_PLAN = [
  { eventSlug: 'tech-meetup-spring-2026', count: 30 },
  { eventSlug: 'product-conference-2026', count: 85 },
];

for (const plan of MOCK_TICKETS_PLAN) {
  const event = await strapi.documents('api::event.event').findFirst({
    filters: { slug: plan.eventSlug },
    populate: { tiers: true },
  });
  if (!event) {
    strapi.log.warn(`[seed] mock-tickets: event ${plan.eventSlug} not found, skip`);
    continue;
  }
  const existingCount = await strapi.db.query('api::ticket.ticket').count({
    where: {
      event: { documentId: event.documentId },
      number: { $startsWith: `MOCK-${plan.eventSlug}-` },
    },
  });
  if (existingCount >= plan.count) {
    strapi.log.info(`[seed] mock-tickets ${plan.eventSlug}: ${existingCount}/${plan.count} already present, skip`);
    continue;
  }
  const tiers = (event as any).tiers ?? [];
  if (tiers.length === 0) {
    strapi.log.warn(`[seed] mock-tickets: ${plan.eventSlug} has no tiers, skip`);
    continue;
  }
  const toCreate = plan.count - existingCount;
  for (let i = existingCount; i < plan.count; i++) {
    const tier = tiers[i % tiers.length];
    await strapi.documents('api::ticket.ticket').create({
      data: {
        number: `MOCK-${plan.eventSlug}-${i}`,
        qrPayload: `mock-qr-${plan.eventSlug}-${i}`,
        status: 'valid',
        attendee: { fullName: `Гость ${i + 1}`, email: `guest${i}@example.com` },
        event: event.documentId,
        tier: tier.documentId,
      },
    });
  }
  strapi.log.info(`[seed] mock-tickets ${plan.eventSlug}: created ${toCreate}`);
}
```

> Component `attendee` имеет `repeatable: false` и обязательные поля — открыть `apps/backend/src/components/attendee/attendee.json` (или аналогичный) перед написанием, чтобы убедиться какие именно поля required. Если есть поле `phone` — добавить `phone: '+70000000000'`. Если есть `consent` boolean — `consent: true`.

- [ ] **Step 2: Запустить сидер**

```bash
docker restart project_work2-backend-1
docker logs project_work2-backend-1 --tail 50 | grep mock-tickets
```

Expected: `created 30` и `created 85`.

- [ ] **Step 3: Проверить availability**

```bash
curl -sS 'http://api.localhost/api/events/tech-meetup-spring-2026/availability'
curl -sS 'http://api.localhost/api/events/product-conference-2026/availability'
```

Expected:
- tech-meetup → `{ capacity: 100, sold: 30, remaining: 70 }`
- product-conference → `{ capacity: 100, sold: 85, remaining: 15 }`

- [ ] **Step 4: Идемпотентность — повторный запуск**

```bash
docker restart project_work2-backend-1
docker logs project_work2-backend-1 --tail 50 | grep mock-tickets
```

Expected: `30/30 already present, skip`, `85/85 already present, skip`.

- [ ] **Step 5: Коммит**

```bash
git add apps/backend/src/seed/dev-seed.ts
git commit -m "feat(backend): добавить mock-tickets для AvailabilityBadge"
```

---

## Этап 4 — Frontend: новые компоненты

### Task 4.1: AppDecorBackground

**Files:**
- Create: `apps/frontend/app/components/AppDecorBackground.vue`

- [ ] **Step 1: Создать компонент**

Файл `apps/frontend/app/components/AppDecorBackground.vue`:

```vue
<script setup lang="ts">
type Variant = 'auth' | 'page' | 'subtle';
const props = defineProps<{ variant?: Variant }>();
const variant = computed<Variant>(() => props.variant ?? 'subtle');
</script>

<template>
  <div class="relative isolate">
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <template v-if="variant === 'auth'">
        <div class="absolute -top-32 -right-24 size-96 rounded-full bg-primary-500/20 blur-3xl" />
        <div class="absolute -bottom-32 -left-24 size-96 rounded-full bg-violet-500/20 blur-3xl" />
      </template>
      <template v-else-if="variant === 'page'">
        <div class="absolute top-0 right-1/4 size-72 rounded-full bg-primary-500/15 blur-3xl" />
        <div class="absolute bottom-0 left-1/4 size-72 rounded-full bg-sky-500/10 blur-3xl" />
      </template>
      <template v-else>
        <div class="absolute top-10 right-10 size-64 rounded-full bg-primary-500/10 blur-3xl" />
        <div class="absolute bottom-10 left-10 size-64 rounded-full bg-violet-500/10 blur-3xl" />
      </template>
    </div>
    <slot />
  </div>
</template>
```

- [ ] **Step 2: Smoke в Nuxt — нет ошибок при автоимпорте**

```bash
docker logs project_work2-frontend-1 --tail 30 --follow & sleep 5; kill %1
curl -sS 'http://app.localhost/' | head -5
```

Expected: статус 200 (компонент пока нигде не используется, не должен ломать сборку).

- [ ] **Step 3: Коммит**

```bash
git add apps/frontend/app/components/AppDecorBackground.vue
git commit -m "feat(frontend): компонент AppDecorBackground с blur-блобами"
```

---

### Task 4.2: CategoryBadge — TDD

**Files:**
- Create: `apps/frontend/app/components/CategoryBadge.vue`
- Create: `apps/frontend/tests/unit/components/CategoryBadge.spec.ts`

- [ ] **Step 1: Написать failing-тест**

Файл `apps/frontend/tests/unit/components/CategoryBadge.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import CategoryBadge from '~/components/CategoryBadge.vue';

describe('CategoryBadge', () => {
  it('рендерит title', async () => {
    const wrapper = await mountSuspended(CategoryBadge, {
      props: { category: { title: 'Митап', colorToken: 'sky' } },
    });
    expect(wrapper.text()).toContain('Митап');
  });

  it('применяет класс цвета по colorToken', async () => {
    const wrapper = await mountSuspended(CategoryBadge, {
      props: { category: { title: 'Конференция', colorToken: 'primary' } },
    });
    expect(wrapper.html()).toMatch(/bg-primary-500\/15|text-primary-/);
  });

  it('не рендерится при отсутствии category', async () => {
    const wrapper = await mountSuspended(CategoryBadge, {
      props: { category: null as any },
    });
    expect(wrapper.text()).toBe('');
  });
});
```

> Если `mountSuspended` не настроен в проекте — использовать `mount` из `@vue/test-utils` напрямую. Проверить существующие тесты в `apps/frontend/tests/unit/` для образца.

- [ ] **Step 2: Запустить тест — должен падать (нет компонента)**

```bash
cd apps/frontend && npm run test:unit -- CategoryBadge
```

Expected: FAIL — `Cannot find module '~/components/CategoryBadge.vue'`.

- [ ] **Step 3: Реализовать компонент**

Файл `apps/frontend/app/components/CategoryBadge.vue`:

```vue
<script setup lang="ts">
type ColorToken = 'primary' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';

const props = defineProps<{
  category: { title: string; colorToken?: ColorToken } | null | undefined;
}>();

const colorClasses: Record<ColorToken, string> = {
  primary: 'bg-primary-500/15 text-primary-300 border-primary-500/30',
  sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

const cls = computed(() => {
  const token = props.category?.colorToken ?? 'primary';
  return colorClasses[token];
});
</script>

<template>
  <span
    v-if="category"
    :class="['inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', cls]"
  >
    {{ category.title }}
  </span>
</template>
```

- [ ] **Step 4: Запустить тест — должен пройти**

```bash
cd apps/frontend && npm run test:unit -- CategoryBadge
```

Expected: PASS, 3 теста.

- [ ] **Step 5: Коммит**

```bash
git add apps/frontend/app/components/CategoryBadge.vue apps/frontend/tests/unit/components/CategoryBadge.spec.ts
git commit -m "feat(frontend): компонент CategoryBadge с тестами"
```

---

### Task 4.3: AvailabilityBadge — TDD (с пороговой логикой)

**Files:**
- Create: `apps/frontend/app/components/AvailabilityBadge.vue`
- Create: `apps/frontend/tests/unit/components/AvailabilityBadge.spec.ts`

- [ ] **Step 1: Написать failing-тест**

Файл `apps/frontend/tests/unit/components/AvailabilityBadge.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import AvailabilityBadge from '~/components/AvailabilityBadge.vue';

describe('AvailabilityBadge', () => {
  it('не рендерится при remaining > 20% от capacity', async () => {
    const w = await mountSuspended(AvailabilityBadge, {
      props: { capacity: 100, remaining: 50 },
    });
    expect(w.text()).toBe('');
  });

  it('рендерит "Осталось N мест" при remaining ≤ 20%', async () => {
    const w = await mountSuspended(AvailabilityBadge, {
      props: { capacity: 100, remaining: 15 },
    });
    expect(w.text()).toContain('Осталось 15 мест');
  });

  it('использует amber при remaining > 10% (но ≤ 20%)', async () => {
    const w = await mountSuspended(AvailabilityBadge, {
      props: { capacity: 100, remaining: 15 },
    });
    expect(w.html()).toMatch(/text-amber-|bg-amber-/);
  });

  it('использует rose при remaining ≤ 10%', async () => {
    const w = await mountSuspended(AvailabilityBadge, {
      props: { capacity: 100, remaining: 5 },
    });
    expect(w.html()).toMatch(/text-rose-|bg-rose-/);
  });

  it('не рендерится при remaining = 0', async () => {
    const w = await mountSuspended(AvailabilityBadge, {
      props: { capacity: 100, remaining: 0 },
    });
    expect(w.text()).toBe('');
  });

  it('правильно склоняет: 1 место, 2 места, 5 мест', async () => {
    const w1 = await mountSuspended(AvailabilityBadge, {
      props: { capacity: 100, remaining: 1 },
    });
    expect(w1.text()).toContain('Осталось 1 место');

    const w2 = await mountSuspended(AvailabilityBadge, {
      props: { capacity: 100, remaining: 3 },
    });
    expect(w2.text()).toContain('Осталось 3 места');

    const w5 = await mountSuspended(AvailabilityBadge, {
      props: { capacity: 100, remaining: 5 },
    });
    expect(w5.text()).toContain('Осталось 5 мест');
  });
});
```

- [ ] **Step 2: Запустить тест — FAIL**

```bash
cd apps/frontend && npm run test:unit -- AvailabilityBadge
```

Expected: FAIL — нет компонента.

- [ ] **Step 3: Реализовать компонент с правильным склонением**

Файл `apps/frontend/app/components/AvailabilityBadge.vue`:

```vue
<script setup lang="ts">
const props = defineProps<{ capacity: number; remaining: number }>();

const ratio = computed(() => (props.capacity > 0 ? props.remaining / props.capacity : 0));
const visible = computed(() => props.remaining > 0 && ratio.value <= 0.2);

const cls = computed(() =>
  ratio.value <= 0.1
    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
    : 'bg-amber-500/15 text-amber-300 border-amber-500/30',
);

function declension(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'место';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'места';
  return 'мест';
}

const label = computed(() => `Осталось ${props.remaining} ${declension(props.remaining)}`);
</script>

<template>
  <span
    v-if="visible"
    :class="['inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', cls]"
  >
    {{ label }}
  </span>
</template>
```

- [ ] **Step 4: Запустить тест — PASS**

```bash
cd apps/frontend && npm run test:unit -- AvailabilityBadge
```

Expected: PASS — все 6 тестов.

- [ ] **Step 5: Коммит**

```bash
git add apps/frontend/app/components/AvailabilityBadge.vue apps/frontend/tests/unit/components/AvailabilityBadge.spec.ts
git commit -m "feat(frontend): компонент AvailabilityBadge с пороговой логикой"
```

---

### Task 4.4: EmptyIllustration — 4 SVG

**Files:**
- Create: `apps/frontend/app/components/EmptyIllustration.vue`
- Create: `apps/frontend/tests/unit/components/EmptyIllustration.spec.ts`

- [ ] **Step 1: Написать failing-тест**

Файл `apps/frontend/tests/unit/components/EmptyIllustration.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import EmptyIllustration from '~/components/EmptyIllustration.vue';

describe('EmptyIllustration', () => {
  it.each(['favorites', 'tickets', 'search', 'generic'] as const)(
    'рендерит SVG для name=%s',
    async (name) => {
      const w = await mountSuspended(EmptyIllustration, { props: { name } });
      expect(w.html()).toContain('<svg');
      expect(w.html()).toMatch(/data-name="[a-z]+"/);
    },
  );

  it('падает на generic при неизвестном name', async () => {
    const w = await mountSuspended(EmptyIllustration, {
      props: { name: 'unknown' as any },
    });
    expect(w.html()).toContain('data-name="generic"');
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

```bash
cd apps/frontend && npm run test:unit -- EmptyIllustration
```

- [ ] **Step 3: Реализовать компонент**

Файл `apps/frontend/app/components/EmptyIllustration.vue`:

```vue
<script setup lang="ts">
type Name = 'favorites' | 'tickets' | 'search' | 'generic';
const props = defineProps<{ name?: Name | string }>();

const valid: Name[] = ['favorites', 'tickets', 'search', 'generic'];
const resolved = computed<Name>(() =>
  valid.includes(props.name as Name) ? (props.name as Name) : 'generic',
);
</script>

<template>
  <div class="size-32 text-slate-500">
    <!-- favorites: сердечко с пунктиром + искры -->
    <svg
      v-if="resolved === 'favorites'"
      data-name="favorites"
      viewBox="0 0 120 120"
      fill="none"
      class="size-full"
    >
      <path
        d="M60 100 L25 60 a18 18 0 0 1 35 -10 a18 18 0 0 1 35 10 Z"
        stroke="currentColor"
        stroke-width="2"
        stroke-dasharray="4 3"
      />
      <circle cx="20" cy="30" r="2" class="fill-primary-400/60" />
      <circle cx="100" cy="35" r="2" class="fill-primary-400/60" />
      <circle cx="95" cy="80" r="2" class="fill-primary-400/60" />
    </svg>

    <!-- tickets: билет с перфорацией -->
    <svg
      v-else-if="resolved === 'tickets'"
      data-name="tickets"
      viewBox="0 0 120 120"
      fill="none"
      class="size-full"
    >
      <rect
        x="15"
        y="35"
        width="90"
        height="50"
        rx="6"
        stroke="currentColor"
        stroke-width="2"
      />
      <line x1="60" y1="35" x2="60" y2="85" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3" />
      <circle cx="90" cy="60" r="4" class="fill-primary-400/40" />
    </svg>

    <!-- search: лупа -->
    <svg
      v-else-if="resolved === 'search'"
      data-name="search"
      viewBox="0 0 120 120"
      fill="none"
      class="size-full"
    >
      <circle cx="50" cy="50" r="25" stroke="currentColor" stroke-width="2" />
      <line x1="70" y1="70" x2="95" y2="95" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
      <circle cx="50" cy="50" r="10" class="fill-primary-400/30" />
    </svg>

    <!-- generic: облачко с многоточием -->
    <svg
      v-else
      data-name="generic"
      viewBox="0 0 120 120"
      fill="none"
      class="size-full"
    >
      <path
        d="M30 70 a18 18 0 0 1 0 -30 a25 25 0 0 1 50 0 a18 18 0 0 1 0 30 Z"
        stroke="currentColor"
        stroke-width="2"
      />
      <circle cx="45" cy="55" r="3" class="fill-primary-400/60" />
      <circle cx="60" cy="55" r="3" class="fill-primary-400/60" />
      <circle cx="75" cy="55" r="3" class="fill-primary-400/60" />
    </svg>
  </div>
</template>
```

- [ ] **Step 4: Запустить тест — PASS**

```bash
cd apps/frontend && npm run test:unit -- EmptyIllustration
```

- [ ] **Step 5: Коммит**

```bash
git add apps/frontend/app/components/EmptyIllustration.vue apps/frontend/tests/unit/components/EmptyIllustration.spec.ts
git commit -m "feat(frontend): SVG-иллюстрации для empty-states"
```

---

### Task 4.5: AppFooter

**Files:**
- Create: `apps/frontend/app/components/AppFooter.vue`
- Create: `apps/frontend/tests/unit/components/AppFooter.spec.ts`

- [ ] **Step 1: Написать failing-тест**

Файл `apps/frontend/tests/unit/components/AppFooter.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import AppFooter from '~/components/AppFooter.vue';

describe('AppFooter', () => {
  it('содержит 5 внутренних ссылок', async () => {
    const w = await mountSuspended(AppFooter);
    const html = w.html();
    expect(html).toContain('/info/about');
    expect(html).toContain('/info/contacts');
    expect(html).toContain('/account/become-speaker');
    expect(html).toContain('/info/terms');
    expect(html).toContain('/info/offer');
  });

  it('соц-ссылки имеют target="_blank" и rel="noopener"', async () => {
    const w = await mountSuspended(AppFooter);
    const externals = w.findAll('a[target="_blank"]');
    expect(externals.length).toBeGreaterThanOrEqual(3);
    for (const a of externals) {
      expect(a.attributes('rel')).toContain('noopener');
    }
  });

  it('содержит copyright', async () => {
    const w = await mountSuspended(AppFooter);
    expect(w.text()).toContain('© 2026');
    expect(w.text()).toContain('Клуб Спикеров');
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

```bash
cd apps/frontend && npm run test:unit -- AppFooter
```

- [ ] **Step 3: Реализовать компонент**

Файл `apps/frontend/app/components/AppFooter.vue`:

```vue
<script setup lang="ts">
const platformLinks = [
  { to: '/info/about', label: 'О нас' },
  { to: '/info/contacts', label: 'Контакты' },
  { to: '/account/become-speaker', label: 'Стать спикером' },
];
const docsLinks = [
  { to: '/info/terms', label: 'Пользовательское соглашение' },
  { to: '/info/offer', label: 'Публичная оферта' },
];
const socialLinks = [
  { href: 'https://t.me/club_speakers', icon: 'i-simple-icons-telegram', label: 'Telegram' },
  { href: 'https://vk.com/club_speakers', icon: 'i-simple-icons-vk', label: 'VK' },
  { href: 'https://youtube.com/@club_speakers', icon: 'i-simple-icons-youtube', label: 'YouTube' },
];
</script>

<template>
  <footer class="hidden border-t border-slate-800 bg-slate-950 lg:block">
    <div class="container mx-auto grid grid-cols-4 gap-8 px-4 py-10">
      <div>
        <div class="text-lg font-semibold text-slate-100">Клуб Спикеров</div>
        <p class="mt-2 text-sm text-slate-400">
          Платформа продажи билетов на конференции, митапы и выступления спикеров.
        </p>
      </div>
      <div>
        <div class="mb-3 text-sm font-semibold text-slate-200">Платформа</div>
        <ul class="space-y-2 text-sm text-slate-400">
          <li v-for="link in platformLinks" :key="link.to">
            <NuxtLink :to="link.to" class="hover:text-slate-100">{{ link.label }}</NuxtLink>
          </li>
        </ul>
      </div>
      <div>
        <div class="mb-3 text-sm font-semibold text-slate-200">Документы</div>
        <ul class="space-y-2 text-sm text-slate-400">
          <li v-for="link in docsLinks" :key="link.to">
            <NuxtLink :to="link.to" class="hover:text-slate-100">{{ link.label }}</NuxtLink>
          </li>
        </ul>
      </div>
      <div>
        <div class="mb-3 text-sm font-semibold text-slate-200">Соцсети</div>
        <ul class="flex gap-3">
          <li v-for="s in socialLinks" :key="s.href">
            <a
              :href="s.href"
              :aria-label="s.label"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex size-9 items-center justify-center rounded-full border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-100"
            >
              <UIcon :name="s.icon" class="size-5" />
            </a>
          </li>
        </ul>
      </div>
    </div>
    <div class="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
      © 2026 Клуб Спикеров. Все права защищены.
    </div>
  </footer>
</template>
```

> **Если** `i-simple-icons-*` не работает — установить `@iconify-json/simple-icons` пакет: `cd apps/frontend && npm install -D @iconify-json/simple-icons`. Проверить наличие `@iconify-json/heroicons` как образец интеграции в `nuxt.config.ts`.

- [ ] **Step 4: Установить @iconify-json/simple-icons если нужно**

```bash
cd apps/frontend && npm install -D @iconify-json/simple-icons
```

- [ ] **Step 5: Запустить тест — PASS**

```bash
cd apps/frontend && npm run test:unit -- AppFooter
```

- [ ] **Step 6: Коммит**

```bash
git add apps/frontend/app/components/AppFooter.vue apps/frontend/tests/unit/components/AppFooter.spec.ts apps/frontend/package.json apps/frontend/package-lock.json
git commit -m "feat(frontend): компонент AppFooter с навигацией и соцсетями"
```

---

## Этап 5 — Frontend: composable availability

### Task 5.1: useEventAvailability composable

**Files:**
- Create: `apps/frontend/app/composables/useEventAvailability.ts`
- Create: `apps/frontend/tests/unit/composables/useEventAvailability.spec.ts`

- [ ] **Step 1: Написать failing-тест**

Файл `apps/frontend/tests/unit/composables/useEventAvailability.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApi = vi.fn();
vi.mock('#app', () => ({
  useNuxtApp: () => ({ $api: mockApi }),
  useState: <T>(_k: string, fn: () => T) => ({ value: fn() }),
}));

import { useEventAvailability } from '~/composables/useEventAvailability';

describe('useEventAvailability', () => {
  beforeEach(() => {
    mockApi.mockReset();
  });

  it('загружает availability по slug', async () => {
    mockApi.mockResolvedValueOnce({ data: { capacity: 100, sold: 30, remaining: 70 } });
    const { fetch, state } = useEventAvailability();
    await fetch('tech-meetup-spring-2026');
    expect(state.value['tech-meetup-spring-2026']).toEqual({ capacity: 100, sold: 30, remaining: 70 });
    expect(mockApi).toHaveBeenCalledWith('/events/tech-meetup-spring-2026/availability');
  });

  it('кэширует результат — повторный fetch не делает запрос', async () => {
    mockApi.mockResolvedValueOnce({ data: { capacity: 100, sold: 30, remaining: 70 } });
    const { fetch } = useEventAvailability();
    await fetch('tech-meetup-spring-2026');
    await fetch('tech-meetup-spring-2026');
    expect(mockApi).toHaveBeenCalledTimes(1);
  });

  it('игнорирует ошибки и не валит вызов', async () => {
    mockApi.mockRejectedValueOnce(new Error('network'));
    const { fetch, state } = useEventAvailability();
    await expect(fetch('any-slug')).resolves.toBeUndefined();
    expect(state.value['any-slug']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

```bash
cd apps/frontend && npm run test:unit -- useEventAvailability
```

- [ ] **Step 3: Реализовать composable**

Файл `apps/frontend/app/composables/useEventAvailability.ts`:

```ts
type Availability = { capacity: number; sold: number; remaining: number };

export function useEventAvailability() {
  const { $api } = useNuxtApp();
  const state = useState<Record<string, Availability>>('event-availability', () => ({}));

  async function fetch(slug: string): Promise<void> {
    if (state.value[slug]) return;
    try {
      const res = await ($api as any)(`/events/${slug}/availability`);
      state.value = { ...state.value, [slug]: res.data };
    } catch {
      // молча игнорируем — UI просто не покажет бейдж
    }
  }

  function get(slug: string): Availability | undefined {
    return state.value[slug];
  }

  return { state, fetch, get };
}
```

- [ ] **Step 4: Запустить — PASS**

```bash
cd apps/frontend && npm run test:unit -- useEventAvailability
```

- [ ] **Step 5: Коммит**

```bash
git add apps/frontend/app/composables/useEventAvailability.ts apps/frontend/tests/unit/composables/useEventAvailability.spec.ts
git commit -m "feat(frontend): composable useEventAvailability с кэшем"
```

---

## Этап 6 — Frontend: изменения существующих компонентов

### Task 6.1: AppTopNav — одна кнопка «Войти»

**Files:**
- Modify: `apps/frontend/app/components/AppTopNav.vue`

- [ ] **Step 1: Открыть AppTopNav.vue, найти блок auth**

Найти `<template v-else>` (или эквивалент), где сейчас две ссылки `/login` и `/register`. Обычно это участок около строки 18-26 (см. аудит).

- [ ] **Step 2: Заменить на одну кнопку**

Заменить две ссылки `<NuxtLink>` (или `<UButton>`) одним блоком:

```vue
<UButton to="/login" color="primary" variant="solid" size="sm">Войти</UButton>
```

Удалить ссылку «Регистрация» полностью.

- [ ] **Step 3: Проверить визуально**

```bash
curl -sS 'http://app.localhost/' | grep -E '(Войти|Регистрация)' | head -5
```

Expected: видна только «Войти», нет «Регистрация» в шапке.

- [ ] **Step 4: Коммит**

```bash
git add apps/frontend/app/components/AppTopNav.vue
git commit -m "feat(frontend): объединить Вход/Регистрация в одну кнопку"
```

---

### Task 6.2: pages/login.vue — CTA «Создать аккаунт»

**Files:**
- Modify: `apps/frontend/app/pages/login.vue`

- [ ] **Step 1: Найти блок-подсказку под формой**

Открыть `apps/frontend/app/pages/login.vue`. Найти текущий блок «Нет аккаунта? Регистрация» (вероятно это `<p>` или `<NuxtLink>` мелким шрифтом).

- [ ] **Step 2: Заменить на разделитель + полноширинную кнопку**

Перед закрытием UCard заменить старую ссылку на:

```vue
<div class="my-4 flex items-center gap-3">
  <div class="h-px flex-1 bg-slate-800" />
  <span class="text-xs text-slate-500">или</span>
  <div class="h-px flex-1 bg-slate-800" />
</div>
<UButton to="/register" variant="ghost" color="primary" block>
  Создать аккаунт
</UButton>
<p class="mt-2 text-center text-xs text-slate-500">
  Регистрация по email
</p>
```

- [ ] **Step 3: Smoke**

```bash
curl -sS 'http://app.localhost/login' | grep -E 'Создать аккаунт|Войти' | head -5
```

Expected: страница содержит «Создать аккаунт» и «Войти» (форма + CTA).

- [ ] **Step 4: Коммит**

```bash
git add apps/frontend/app/pages/login.vue
git commit -m "feat(frontend): добавить CTA «Создать аккаунт» на /login"
```

---

### Task 6.3: EventCard — CategoryBadge + AvailabilityBadge + venue

**Files:**
- Modify: `apps/frontend/app/components/EventCard.vue`
- Modify: `apps/frontend/app/pages/index.vue` (вызвать availability fetch)

- [ ] **Step 1: Расширить EventCard.vue**

Найти блок с title (обычно `<h3>` после aspect-ratio cover-image). Перед `<h3>` добавить ряд бейджей:

```vue
<div class="mb-2 flex flex-wrap items-center gap-2">
  <CategoryBadge v-if="event.category" :category="event.category" />
  <AvailabilityBadge
    v-if="availability"
    :capacity="availability.capacity"
    :remaining="availability.remaining"
  />
</div>
```

В props компонента (`<script setup>`) расширить:

```ts
defineProps<{
  event: any;
  availability?: { capacity: number; remaining: number } | null;
}>();
```

После title добавить мелкое название площадки:

```vue
<div v-if="event.venue?.name" class="mt-1 flex items-center gap-1 text-xs text-slate-400">
  <UIcon name="i-heroicons-map-pin" class="size-3" />
  <span class="truncate">{{ event.venue.name }}</span>
</div>
```

- [ ] **Step 2: Подключить availability на главной**

Открыть `apps/frontend/app/pages/index.vue`. После загрузки списка событий (в setup, после useAsyncData) добавить fetch availability для каждого:

```ts
const { fetch: fetchAvailability, get: getAvailability } = useEventAvailability();

watch(() => events.value, (list) => {
  if (!list) return;
  for (const e of list) {
    fetchAvailability(e.slug);
  }
}, { immediate: true });
```

> Если `events` приходит из `useAsyncData` под другим именем — адаптировать.

В template передать availability в EventCard:

```vue
<EventCard
  v-for="event in events"
  :key="event.documentId"
  :event="event"
  :availability="getAvailability(event.slug)"
/>
```

> Также убедиться что фронт запрашивает `category` в populate главной. В месте вызова `$api('/events?populate[]=...')` или подобного добавить `populate[5]=category` (или как именуется параметр в коде). Если используется уже встроенный wrapper — найти его и расширить.

- [ ] **Step 3: Smoke**

```bash
curl -sS 'http://app.localhost/' | grep -E 'Митап|Конференция|Осталось 15 мест' | head -5
```

Expected: видны «Митап», «Конференция», «Осталось 15 мест».

- [ ] **Step 4: Коммит**

```bash
git add apps/frontend/app/components/EventCard.vue apps/frontend/app/pages/index.vue
git commit -m "feat(frontend): EventCard с категорией, площадкой и остатком мест"
```

---

### Task 6.4: EventCardCompact + EventHero — CategoryBadge + AvailabilityBadge

**Files:**
- Modify: `apps/frontend/app/components/EventCardCompact.vue`
- Modify: `apps/frontend/app/components/EventHero.vue`

- [ ] **Step 1: EventCardCompact — добавить CategoryBadge**

Найти блок с title (обычно flex с cover слева + контентом справа). В контентной колонке перед title добавить:

```vue
<CategoryBadge v-if="event.category" :category="event.category" class="mb-1" />
```

- [ ] **Step 2: EventHero — добавить бейджи в overlay**

Найти overlay (где `<AppBackButton />` и `<FavoriteToggle />` сейчас). Добавить дополнительный блок поверх cover, ниже back-button, выше title:

```vue
<div class="absolute bottom-4 left-4 flex flex-wrap gap-2">
  <CategoryBadge v-if="event.category" :category="event.category" />
  <AvailabilityBadge
    v-if="availability"
    :capacity="availability.capacity"
    :remaining="availability.remaining"
  />
</div>
```

В props EventHero расширить optional prop:

```ts
defineProps<{
  event: any;
  availability?: { capacity: number; remaining: number } | null;
}>();
```

- [ ] **Step 3: Подключить availability на странице события**

Найти `apps/frontend/app/pages/events/[slug]/index.vue`. После загрузки event добавить:

```ts
const { fetch: fetchAvailability, get: getAvailability } = useEventAvailability();
watchEffect(() => {
  if (event.value?.slug) fetchAvailability(event.value.slug);
});
const availability = computed(() => (event.value?.slug ? getAvailability(event.value.slug) : undefined));
```

В template передать в EventHero:

```vue
<EventHero :event="event" :availability="availability" />
```

- [ ] **Step 4: Smoke**

```bash
curl -sS 'http://app.localhost/events/product-conference-2026' | grep -E 'Конференция|Осталось 15 мест' | head -3
```

Expected: видны оба бейджа.

- [ ] **Step 5: Коммит**

```bash
git add apps/frontend/app/components/EventCardCompact.vue apps/frontend/app/components/EventHero.vue apps/frontend/app/pages/events/\[slug\]/index.vue
git commit -m "feat(frontend): бейджи категории и остатка на компактной карточке и hero"
```

---

### Task 6.5: AppEmpty — EmptyIllustration

**Files:**
- Modify: `apps/frontend/app/components/AppEmpty.vue`
- Modify: `apps/frontend/app/pages/account/favorites.vue`
- Modify: `apps/frontend/app/pages/tickets/index.vue`
- Modify: `apps/frontend/app/pages/search.vue`

- [ ] **Step 1: Расширить AppEmpty.vue**

Открыть `apps/frontend/app/components/AppEmpty.vue`. В props добавить optional `illustration?: string`. В template заменить блок с иконкой на:

```vue
<EmptyIllustration v-if="illustration" :name="illustration" />
<UIcon v-else-if="icon" :name="icon" class="size-12 text-slate-600" />
```

(Старая логика с `icon` остаётся как fallback.)

Также обернуть всё содержимое в `<AppDecorBackground variant="subtle">`:

```vue
<template>
  <AppDecorBackground variant="subtle">
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <EmptyIllustration v-if="illustration" :name="illustration" />
      <UIcon v-else-if="icon" :name="icon" class="size-12 text-slate-600" />
      <h2 class="mt-4 text-lg font-semibold text-slate-200">{{ title }}</h2>
      <p v-if="description" class="mt-2 text-sm text-slate-400">{{ description }}</p>
      <slot />
    </div>
  </AppDecorBackground>
</template>
```

- [ ] **Step 2: Применить illustration в трёх страницах**

В `pages/account/favorites.vue` найти `<AppEmpty ... />` и добавить prop:

```vue
<AppEmpty
  illustration="favorites"
  title="Ничего в избранном"
  description="Добавляйте интересные мероприятия — они появятся здесь."
/>
```

В `pages/tickets/index.vue` empty:

```vue
<AppEmpty
  illustration="tickets"
  title="У вас ещё нет билетов"
  description="Купите билет — он будет здесь с QR-кодом."
/>
```

В `pages/search.vue` (no-results state):

```vue
<AppEmpty
  illustration="search"
  title="Ничего не нашли"
  description="Попробуйте изменить запрос."
/>
```

- [ ] **Step 3: Smoke**

```bash
curl -sS 'http://app.localhost/account/favorites' | grep -E 'data-name="favorites"' | head -3
curl -sS 'http://app.localhost/tickets' | grep -E 'data-name="tickets"' | head -3
curl -sS 'http://app.localhost/search?q=ыыыыы' | grep -E 'data-name="search"' | head -3
```

Expected: каждый запрос возвращает строку с `data-name="..."` соответствующего типа.

- [ ] **Step 4: Коммит**

```bash
git add apps/frontend/app/components/AppEmpty.vue apps/frontend/app/pages/account/favorites.vue apps/frontend/app/pages/tickets/index.vue apps/frontend/app/pages/search.vue
git commit -m "feat(frontend): SVG-иллюстрации в empty-states (избранное, билеты, поиск)"
```

---

### Task 6.6: layouts/auth.vue — AppDecorBackground

**Files:**
- Modify: `apps/frontend/app/layouts/auth.vue`

- [ ] **Step 1: Обернуть slot в AppDecorBackground**

Открыть `apps/frontend/app/layouts/auth.vue`. Найти `<slot />` или `<NuxtPage />`. Обернуть:

```vue
<template>
  <AppDecorBackground variant="auth">
    <div class="flex min-h-screen items-center justify-center px-4">
      <div class="w-full max-w-sm">
        <slot />
      </div>
    </div>
  </AppDecorBackground>
</template>
```

(Адаптируй под существующую разметку — сохрани классы centered-flex, добавь обёртку.)

- [ ] **Step 2: Smoke**

```bash
curl -sS 'http://app.localhost/login' | grep -E 'blur-3xl' | head -3
```

Expected: одна-две строки с `blur-3xl`.

- [ ] **Step 3: Коммит**

```bash
git add apps/frontend/app/layouts/auth.vue
git commit -m "feat(frontend): фоновые блобы на layout auth"
```

---

### Task 6.7: Применить AppDecorBackground на формовых страницах

**Files:**
- Modify: `apps/frontend/app/pages/account/become-speaker.vue`
- Modify: `apps/frontend/app/pages/account/contact-manager.vue`

- [ ] **Step 1: Обернуть become-speaker.vue**

Открыть, обернуть всё содержимое template в:

```vue
<template>
  <AppDecorBackground variant="subtle">
    <div class="container mx-auto px-4 py-6">
      <!-- старое содержимое -->
    </div>
  </AppDecorBackground>
</template>
```

(Подставить точные классы/обёртки которые уже были.)

- [ ] **Step 2: Аналогично contact-manager.vue**

То же самое.

- [ ] **Step 3: Smoke**

```bash
curl -sS 'http://app.localhost/account/become-speaker' | grep blur-3xl | head -3
curl -sS 'http://app.localhost/account/contact-manager' | grep blur-3xl | head -3
```

Expected: каждый ответ содержит `blur-3xl` (декор есть).

- [ ] **Step 4: Коммит**

```bash
git add apps/frontend/app/pages/account/become-speaker.vue apps/frontend/app/pages/account/contact-manager.vue
git commit -m "feat(frontend): фоновые блобы на формовых страницах account"
```

---

### Task 6.8: layouts/default.vue — подключить AppFooter

**Files:**
- Modify: `apps/frontend/app/layouts/default.vue`

- [ ] **Step 1: Подключить AppFooter после slot**

Открыть `apps/frontend/app/layouts/default.vue`. Найти `<slot />` или `<main>`. Сразу после закрытия `<main>` (перед `<AppBottomNav>`) добавить:

```vue
<AppFooter />
```

- [ ] **Step 2: Smoke desktop**

```bash
curl -sS 'http://app.localhost/' | grep -E '© 2026|Клуб Спикеров' | head -3
```

Expected: одна строка с `© 2026 Клуб Спикеров. Все права защищены.`.

- [ ] **Step 3: Коммит**

```bash
git add apps/frontend/app/layouts/default.vue
git commit -m "feat(frontend): подключить AppFooter в default layout"
```

---

## Этап 7 — Frontend: info-страницы

### Task 7.1: pages/info/about.vue

**Files:**
- Create: `apps/frontend/app/pages/info/about.vue`

- [ ] **Step 1: Создать страницу**

```vue
<script setup lang="ts">
useHead({ title: 'О платформе — Клуб Спикеров' });
</script>

<template>
  <AppDecorBackground variant="subtle">
    <div class="container mx-auto px-4 py-10">
      <h1 class="text-2xl font-semibold text-slate-100">О платформе</h1>
      <div class="prose prose-invert mt-6 max-w-3xl">
        <p>
          Клуб Спикеров — платформа для покупки билетов на конференции, митапы и
          выступления приглашённых спикеров. Мы собираем мероприятия, которые
          реально стоит посетить, и делаем покупку билета максимально простой.
        </p>
        <p>
          На платформе вы найдёте события разных форматов: открытые лекции,
          практические воркшопы, профессиональные конференции и закрытые митапы
          с лидерами индустрии.
        </p>
        <p>
          Если вы организатор и хотите проводить мероприятия у нас — свяжитесь
          с нашим менеджером через раздел «Стать спикером».
        </p>
      </div>
    </div>
  </AppDecorBackground>
</template>
```

- [ ] **Step 2: Smoke**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" 'http://app.localhost/info/about'
```

Expected: `200`.

- [ ] **Step 3: Коммит**

```bash
git add apps/frontend/app/pages/info/about.vue
git commit -m "feat(frontend): страница /info/about"
```

---

### Task 7.2: pages/info/contacts.vue (с формой)

**Files:**
- Create: `apps/frontend/app/pages/info/contacts.vue`

- [ ] **Step 1: Создать страницу**

```vue
<script setup lang="ts">
import { z } from 'zod';
const { $api } = useNuxtApp();
const toast = useToast();

useHead({ title: 'Контакты — Клуб Спикеров' });

const schema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  email: z.string().email('Некорректный email'),
  message: z.string().min(10, 'Минимум 10 символов'),
});
type Form = z.infer<typeof schema>;
const form = reactive<Form>({ name: '', email: '', message: '' });
const submitting = ref(false);

async function onSubmit() {
  submitting.value = true;
  try {
    await ($api as any)('/manager-contact-requests', {
      method: 'POST',
      body: { data: { topic: 'Обращение с контактной страницы', message: `${form.name} <${form.email}>: ${form.message}`, contact: form.email } },
    });
    toast.add({ title: 'Сообщение отправлено', color: 'success' });
    form.name = ''; form.email = ''; form.message = '';
  } catch (e) {
    toast.add({ title: 'Ошибка отправки', description: 'Попробуйте позже', color: 'error' });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <AppDecorBackground variant="subtle">
    <div class="container mx-auto grid gap-10 px-4 py-10 lg:grid-cols-2">
      <div>
        <h1 class="text-2xl font-semibold text-slate-100">Контакты</h1>
        <div class="prose prose-invert mt-4 max-w-none">
          <p>Свяжитесь с нами удобным способом:</p>
          <ul>
            <li><strong>Email:</strong> hello@club-speakers.ru</li>
            <li><strong>Телефон:</strong> +7 (495) 000-00-00</li>
            <li><strong>Юр. адрес:</strong> 123456, Москва, ул. Образцова, д. 1</li>
          </ul>
        </div>
      </div>
      <UForm :schema="schema" :state="form" class="space-y-4" @submit="onSubmit">
        <h2 class="text-lg font-semibold text-slate-100">Написать нам</h2>
        <UFormField name="name" label="Имя" required>
          <UInput v-model="form.name" placeholder="Ваше имя" />
        </UFormField>
        <UFormField name="email" label="Email" required>
          <UInput v-model="form.email" type="email" placeholder="you@example.com" />
        </UFormField>
        <UFormField name="message" label="Сообщение" required>
          <UTextarea v-model="form.message" :rows="5" placeholder="Чем мы можем помочь?" />
        </UFormField>
        <UButton type="submit" :loading="submitting" color="primary">Отправить</UButton>
      </UForm>
    </div>
  </AppDecorBackground>
</template>
```

- [ ] **Step 2: Smoke**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" 'http://app.localhost/info/contacts'
```

Expected: `200`.

- [ ] **Step 3: Коммит**

```bash
git add apps/frontend/app/pages/info/contacts.vue
git commit -m "feat(frontend): страница /info/contacts с формой обратной связи"
```

---

### Task 7.3: pages/info/terms.vue

**Files:**
- Create: `apps/frontend/app/pages/info/terms.vue`

- [ ] **Step 1: Создать страницу**

```vue
<script setup lang="ts">
useHead({ title: 'Пользовательское соглашение — Клуб Спикеров' });
</script>

<template>
  <AppDecorBackground variant="subtle">
    <div class="container mx-auto px-4 py-10">
      <h1 class="text-2xl font-semibold text-slate-100">Пользовательское соглашение</h1>
      <div class="prose prose-invert mt-6 max-w-3xl">
        <h2>1. Предмет соглашения</h2>
        <p>
          Настоящее соглашение регулирует отношения между администрацией платформы
          «Клуб Спикеров» (далее — Платформа) и пользователем, посещающим сайт
          и использующим его сервисы для покупки билетов на мероприятия.
        </p>
        <h2>2. Регистрация и учётная запись</h2>
        <p>
          Для покупки билетов необходимо создать учётную запись. Пользователь
          обязуется указывать достоверные данные и нести ответственность за их
          актуальность. Передача учётных данных третьим лицам запрещена.
        </p>
        <h2>3. Покупка билетов</h2>
        <p>
          Билет является именным электронным документом, подтверждающим право
          посещения мероприятия. После оплаты Пользователь получает доступ к QR-коду
          билета в личном кабинете. Возврат билетов осуществляется в соответствии
          с правилами конкретного мероприятия и российским законодательством.
        </p>
        <h2>4. Ответственность сторон</h2>
        <p>
          Платформа не несёт ответственности за изменения в программе или формате
          мероприятия, организованного третьим лицом. В случае отмены мероприятия
          Платформа возвращает стоимость билетов в полном объёме.
        </p>
        <h2>5. Изменение соглашения</h2>
        <p>
          Платформа вправе изменять условия настоящего соглашения. Актуальная
          редакция всегда доступна по этому адресу. Продолжая использовать сервис
          после изменений, Пользователь подтверждает согласие с новой редакцией.
        </p>
      </div>
    </div>
  </AppDecorBackground>
</template>
```

- [ ] **Step 2: Smoke**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" 'http://app.localhost/info/terms'
```

Expected: `200`.

- [ ] **Step 3: Коммит**

```bash
git add apps/frontend/app/pages/info/terms.vue
git commit -m "feat(frontend): страница /info/terms"
```

---

### Task 7.4: pages/info/offer.vue

**Files:**
- Create: `apps/frontend/app/pages/info/offer.vue`

- [ ] **Step 1: Создать страницу**

```vue
<script setup lang="ts">
useHead({ title: 'Публичная оферта — Клуб Спикеров' });
</script>

<template>
  <AppDecorBackground variant="subtle">
    <div class="container mx-auto px-4 py-10">
      <h1 class="text-2xl font-semibold text-slate-100">Публичная оферта</h1>
      <div class="prose prose-invert mt-6 max-w-3xl">
        <h2>1. Продавец</h2>
        <p>
          Продавцом по настоящей оферте выступает ООО «Клуб Спикеров»,
          ОГРН 1234567890123, адрес: 123456, Москва, ул. Образцова, д. 1.
        </p>
        <h2>2. Предмет оферты</h2>
        <p>
          Продавец обязуется передать Покупателю электронные билеты на
          мероприятия, размещённые на Платформе, а Покупатель — оплатить их
          по указанной цене.
        </p>
        <h2>3. Цена и порядок оплаты</h2>
        <p>
          Цена билетов указана в каталоге мероприятий и включает все применимые
          налоги. Оплата производится банковской картой или СБП через защищённое
          соединение. Реквизиты карт не сохраняются на серверах Платформы.
        </p>
        <h2>4. Возврат и обмен</h2>
        <p>
          Возврат билетов возможен не позднее, чем за 24 часа до начала
          мероприятия, если иное не указано в правилах конкретного мероприятия.
          Сумма возврата перечисляется на карту, с которой производилась оплата,
          в течение 10 рабочих дней.
        </p>
      </div>
    </div>
  </AppDecorBackground>
</template>
```

- [ ] **Step 2: Smoke**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" 'http://app.localhost/info/offer'
```

Expected: `200`.

- [ ] **Step 3: Коммит**

```bash
git add apps/frontend/app/pages/info/offer.vue
git commit -m "feat(frontend): страница /info/offer"
```

---

## Этап 8 — Финальная верификация

### Task 8.1: Playwright smoke — auth-кнопка и footer-навигация

**Files:**
- Create: `apps/frontend/tests/e2e/polish-smoke.spec.ts`

- [ ] **Step 1: Написать e2e**

Файл `apps/frontend/tests/e2e/polish-smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Polish: navigation and visual', () => {
  test('в шапке одна кнопка «Войти», нет «Регистрация»', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header, nav').first();
    await expect(header.getByText('Войти')).toBeVisible();
    await expect(header.getByText('Регистрация')).toHaveCount(0);
  });

  test('на /login есть видимая кнопка «Создать аккаунт»', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /создать аккаунт/i })).toBeVisible();
  });

  test.describe('footer (desktop)', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('footer виден и все 5 внутренних ссылок открываются', async ({ page }) => {
      await page.goto('/');
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();

      const internal = ['/info/about', '/info/contacts', '/account/become-speaker', '/info/terms', '/info/offer'];
      for (const href of internal) {
        const link = footer.locator(`a[href="${href}"]`).first();
        await expect(link).toBeVisible();
      }
    });

    test('footer-ссылки ведут на 200-страницы', async ({ page }) => {
      const paths = ['/info/about', '/info/contacts', '/info/terms', '/info/offer'];
      for (const p of paths) {
        const res = await page.goto(p);
        expect(res?.status()).toBe(200);
        await expect(page.locator('h1')).toBeVisible();
      }
    });
  });

  test.describe('footer (mobile)', () => {
    test.use({ viewport: { width: 390, height: 800 } });

    test('footer скрыт на мобиле', async ({ page }) => {
      await page.goto('/');
      const footer = page.locator('footer');
      // hidden lg:block → не виден в мобильном viewport
      await expect(footer).toBeHidden();
    });
  });

  test('главная: видна категория «Митап» и AvailabilityBadge', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Митап|Конференция/).first()).toBeVisible();
    await expect(page.getByText(/Осталось \d+ мест/i)).toBeVisible();
  });

  test('empty-state: /search с бессмысленным запросом — иллюстрация search', async ({ page }) => {
    await page.goto('/search?q=ыыыыыы');
    await expect(page.locator('svg[data-name="search"]')).toBeVisible();
  });
});
```

- [ ] **Step 2: Запустить e2e**

```bash
cd apps/frontend && npx playwright test --config=pw-smoke.config.ts polish-smoke
```

Expected: все тесты PASS.

- [ ] **Step 3: Если падает — диагностировать конкретный тест и поправить либо UI, либо сам тест**

> Не маскируй неудачи. Если в шапке всё ещё видна «Регистрация» — вернуться к Task 6.1. Если footer не отображается на 1280px — проверить класс `lg:block` в AppFooter.

- [ ] **Step 4: Коммит**

```bash
git add apps/frontend/tests/e2e/polish-smoke.spec.ts
git commit -m "test(frontend): e2e smoke для polish-доработки прототипа"
```

---

### Task 8.2: Полный smoke 17 страниц + регрессии

**Files:**
- (read-only verification)

- [ ] **Step 1: Smoke всех 17 страниц**

```bash
for path in / /events/tech-meetup-spring-2026 /events/product-conference-2026 /search /login /register /account /account/favorites /account/sessions /account/become-speaker /account/contact-manager /tickets /info/about /info/contacts /info/terms /info/offer; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" "http://app.localhost${path}")
  echo "${path} → ${code}"
done
```

Expected: все строки заканчиваются на `200`.

- [ ] **Step 2: Регрессии — backend и frontend логи**

```bash
docker logs project_work2-backend-1 --tail 100 | grep -i 'error\|exception' | head -20
docker logs project_work2-frontend-1 --tail 100 | grep -i 'error\|hydration' | head -20
```

Expected: пусто или только warnings (не errors).

- [ ] **Step 3: Полный backend integration suite**

```bash
docker exec project_work2-backend-1 npm run test:integration
```

Expected: всё PASS.

- [ ] **Step 4: Полный frontend unit suite**

```bash
cd apps/frontend && npm run test:unit
```

Expected: всё PASS.

- [ ] **Step 5: Финальный отчёт**

Создать summary в формате коммита (без коммита) или комментарием в session output:
- Что добавлено: новые компоненты (5), новые страницы (4), новый content-type (1), новый endpoint (1).
- Тестов добавлено: integration (2), unit (5), e2e (1 файл).
- Все DoD-пункты пройдены: список из spec п.10.

---

## Self-Review

**Spec coverage:**

| Раздел spec | Закрыто в задаче |
|---|---|
| 1. Объединение Вход/Регистрация | Task 6.1 + 6.2 |
| 2. Backend Category content-type | Task 1.1, 1.2, 1.3 |
| 3. Backend availability endpoint | Task 2.1 |
| 4. Сидер: категории + mock-tickets | Task 3.1, 3.2 |
| 5. Frontend новые компоненты | Task 4.1–4.5, 5.1 |
| 6. Footer | Task 4.5 (компонент) + 6.8 (подключение) |
| 7. Info-страницы | Task 7.1–7.4 |
| 8. Decor backgrounds | Task 6.6, 6.7 + 6.5 (внутри AppEmpty) |
| 9. EmptyIllustration SVG | Task 4.4 + 6.5 |
| 10. DoD | Task 8.1, 8.2 |

Все 10 разделов закрыты задачами.

**Type consistency:**

- `Availability` тип используется в composable (`{ capacity, sold, remaining }`) и в backend ответе (`{ data: { capacity, sold, remaining } }`) — совпадает.
- `CategoryBadge` props: `{ category: { title, colorToken } }` — согласовано во всех местах применения (EventCard, EventCardCompact, EventHero).
- `AvailabilityBadge` props: `{ capacity, remaining }` — согласовано.

**Placeholder scan:** все шаги содержат конкретный код или конкретные команды. Места с фразами вида «адаптируй под существующую разметку» снабжены явным примером и читаются как инструкция, а не плейсхолдер.

---

## Open notes

- Если в проекте `mountSuspended` из `@nuxt/test-utils/runtime` не работает — установить пакет `@nuxt/test-utils` в devDependencies и использовать `mount` из `@vue/test-utils` как запасной вариант. Конкретный выбор делает исполнитель первой задачи (Task 4.2) и придерживается его дальше.
- `pw-smoke.config.ts` уже существует и используется в smoke-prototype.spec.ts. Новый `polish-smoke.spec.ts` укладывается в тот же конфиг (директория `tests/e2e/`).
- Если в админке backend permission не подцепляется автоматически — выполнить `docker exec project_work2-backend-1 npm run strapi reload-permissions` или просто перезапустить контейнер.
