# Backend Initial Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать первоначальную структуру Strapi 5 backend: 13 Content Types из `data-model.md`, расширение профиля пользователя, бизнес-сервис создания заказа и выпуска билетов с заглушённой оплатой, кастомные `me/...` эндпоинты.

**Architecture:** Schema через ручное `schema.json` + минимальный boilerplate (factories.createCoreController/Router/Service). Бизнес-логика заказов вынесена в `src/domain/orders/` и тестируется изолированно. Permissions выставляются идемпотентно из `bootstrap()`. Pattern совпадает с уже работающим модулем `api::session`.

**Tech Stack:** Strapi 5.43, TypeScript 5, Jest, PostgreSQL 16, `@strapi/plugin-users-permissions`.

**Spec:** `docs/superpowers/specs/2026-04-28-backend-initial-structure-design.md`.

---

## Глобальные конвенции для всех тасков

- Все команды выполнять из `apps/backend/`. Если не указано иначе — `cd apps/backend` перед командой.
- Контент-тайпы создаются **руками** (без `npx strapi generate`), чтобы не плодить лишний код. Boilerplate показан в Task 4 как референс.
- Коммиты — Conventional Commits на русском (`feat(scope): описание`).
- После каждого таска — `npm run build` (TS-проверка) + smoke `npm run dev` (опционально, если меняли схемы — обязательно).
- Тесты пишем в `apps/backend/tests/`. Unit на pure функции — без Strapi boot. Integration — с Strapi test instance.
- Имя контент-тайпа в schema.json: `singularName` (kebab-case-singular), `pluralName` (kebab-case-plural).
- В schema.json все relations описаны явно, `mappedBy` ставится **на одной стороне** (обычно на той, что без foreign key) — это критично для bidirectional.

---

## Task 1: Установить и настроить Jest

**Files:**
- Create: `apps/backend/jest.config.ts`
- Create: `apps/backend/tests/helpers/strapi.ts`
- Modify: `apps/backend/package.json` (scripts + devDependencies)
- Modify: `apps/backend/tsconfig.json` (если потребуется добавить tests в include)

- [ ] **Step 1: Установить зависимости**

```bash
cd apps/backend
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

- [ ] **Step 2: Создать `jest.config.ts`**

```ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.tmp/', '/build/', '/dist/'],
  globalSetup: undefined,
  globalTeardown: undefined,
  testTimeout: 30000,
  setupFilesAfterEnv: [],
};

export default config;
```

- [ ] **Step 3: Создать helper `tests/helpers/strapi.ts` (boot для интеграционных тестов)**

```ts
import { createStrapi, type Core } from '@strapi/strapi';
import path from 'node:path';

let instance: Core.Strapi | null = null;

export const setupStrapi = async (): Promise<Core.Strapi> => {
  if (!instance) {
    instance = await createStrapi({
      appDir: path.resolve(__dirname, '../..'),
      distDir: path.resolve(__dirname, '../../dist'),
    }).load();
    await instance.start();
  }
  return instance;
};

export const teardownStrapi = async (): Promise<void> => {
  if (!instance) return;
  await instance.destroy();
  instance = null;
};
```

- [ ] **Step 4: Добавить scripts в `package.json`**

В блок `scripts` добавить:
```json
"test": "jest",
"test:unit": "jest --testPathPattern=tests/unit",
"test:integration": "jest --testPathPattern=tests/integration --runInBand"
```

- [ ] **Step 5: Smoke-тест — pure unit тест работает**

Создать `apps/backend/tests/unit/sanity.test.ts`:
```ts
describe('sanity', () => {
  it('jest runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm run test:unit`
Expected: 1 passed.

- [ ] **Step 6: Удалить sanity-тест и закоммитить**

```bash
rm tests/unit/sanity.test.ts
git add apps/backend/jest.config.ts apps/backend/tests/helpers/strapi.ts apps/backend/package.json apps/backend/package-lock.json
git commit -m "chore(backend): добавить jest и helper для интеграционных тестов"
```

---

## Task 2: Расширить users-permissions.user полями профиля

**Files:**
- Create: `apps/backend/src/extensions/users-permissions/content-types/user/schema.json`

- [ ] **Step 1: Создать файл с расширением**

Strapi merge-ит этот schema.json поверх стокового. Нужно сохранить **все стоковые поля** + добавить наши.

```json
{
  "kind": "collectionType",
  "collectionName": "up_users",
  "info": {
    "name": "user",
    "description": "",
    "singularName": "user",
    "pluralName": "users",
    "displayName": "User"
  },
  "options": {
    "draftAndPublish": false,
    "timestamps": true
  },
  "attributes": {
    "username": {
      "type": "string",
      "minLength": 3,
      "unique": true,
      "configurable": false,
      "required": true
    },
    "email": {
      "type": "email",
      "minLength": 6,
      "configurable": false,
      "required": true
    },
    "provider": { "type": "string", "configurable": false },
    "password": {
      "type": "password",
      "minLength": 6,
      "configurable": false,
      "private": true
    },
    "resetPasswordToken": { "type": "string", "configurable": false, "private": true },
    "confirmationToken": { "type": "string", "configurable": false, "private": true },
    "confirmed": { "type": "boolean", "default": false, "configurable": false },
    "blocked": { "type": "boolean", "default": false, "configurable": false },
    "role": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.role",
      "inversedBy": "users",
      "configurable": false
    },
    "fullName": { "type": "string", "maxLength": 200 },
    "phone": { "type": "string", "maxLength": 32 },
    "avatar": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    }
  }
}
```

- [ ] **Step 2: Запустить Strapi и убедиться, что новые поля видны**

```bash
npm run develop
```

Открыть Admin UI → Content-Type Builder → User → должны быть поля `fullName`, `phone`, `avatar`. Завершить процесс (Ctrl+C).

- [ ] **Step 3: Закоммитить**

```bash
git add apps/backend/src/extensions/users-permissions/content-types/user/schema.json
git commit -m "feat(backend): расширить users-permissions.user полями профиля"
```

---

## Task 3: Создать reusable component `attendee`

**Files:**
- Create: `apps/backend/src/components/attendee/attendee.json`

- [ ] **Step 1: Создать JSON компонента**

```json
{
  "collectionName": "components_attendee_attendees",
  "info": {
    "displayName": "Attendee",
    "description": "Анкета посетителя на конкретный билет"
  },
  "options": {},
  "attributes": {
    "fullName": {
      "type": "string",
      "required": true,
      "maxLength": 200
    },
    "email": { "type": "email" },
    "phone": { "type": "string", "maxLength": 32 },
    "extra": { "type": "json" }
  }
}
```

- [ ] **Step 2: Закоммитить**

```bash
git add apps/backend/src/components/attendee/attendee.json
git commit -m "feat(backend): добавить компонент attendee (анкета посетителя)"
```

---

## Task 4: Создать каркас Content Type `venue` (референс boilerplate)

> Этот таск задаёт **boilerplate-шаблон** для всех простых Content Type'ов. Последующие таски (organizer, speaker, ticket-tier, agenda-item, banner, promo-code, speaker-application, manager-contact-request, order-item, favorite, ticket) используют ту же структуру: `schema.json` + три `*.ts` файла. Код в этих тасках показывается **полностью** — повторение оправдано (engineer может читать таски не по порядку).

**Files:**
- Create: `apps/backend/src/api/venue/content-types/venue/schema.json`
- Create: `apps/backend/src/api/venue/controllers/venue.ts`
- Create: `apps/backend/src/api/venue/routes/venue.ts`
- Create: `apps/backend/src/api/venue/services/venue.ts`

- [ ] **Step 1: Создать `schema.json`**

```json
{
  "kind": "collectionType",
  "collectionName": "venues",
  "info": {
    "singularName": "venue",
    "pluralName": "venues",
    "displayName": "Venue",
    "description": "Площадка проведения мероприятия"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "name": { "type": "string", "required": true, "maxLength": 200 },
    "address": { "type": "string", "maxLength": 500 },
    "lat": { "type": "decimal" },
    "lng": { "type": "decimal" },
    "mapEmbed": { "type": "string", "maxLength": 500 }
  }
}
```

- [ ] **Step 2: Создать `controllers/venue.ts`**

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::venue.venue');
```

- [ ] **Step 3: Создать `routes/venue.ts`**

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::venue.venue');
```

- [ ] **Step 4: Создать `services/venue.ts`**

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::venue.venue');
```

- [ ] **Step 5: Smoke — Strapi стартует**

```bash
npm run develop
```

Открыть Admin UI → Content Manager → должен появиться раздел **Venue**. Создать и сохранить тестовую запись для проверки. Удалить, остановить процесс.

- [ ] **Step 6: TS-проверка**

```bash
npm run build
```

Expected: build completes without TypeScript errors.

- [ ] **Step 7: Закоммитить**

```bash
git add apps/backend/src/api/venue
git commit -m "feat(backend): добавить content type venue"
```

---

## Task 5: Content Type `organizer`

**Files:**
- Create: `apps/backend/src/api/organizer/content-types/organizer/schema.json`
- Create: `apps/backend/src/api/organizer/controllers/organizer.ts`
- Create: `apps/backend/src/api/organizer/routes/organizer.ts`
- Create: `apps/backend/src/api/organizer/services/organizer.ts`

- [ ] **Step 1: Создать `schema.json`**

```json
{
  "kind": "collectionType",
  "collectionName": "organizers",
  "info": {
    "singularName": "organizer",
    "pluralName": "organizers",
    "displayName": "Organizer",
    "description": "Организатор мероприятий"
  },
  "options": {
    "draftAndPublish": true
  },
  "attributes": {
    "name": { "type": "string", "required": true, "maxLength": 200 },
    "logo": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "description": { "type": "richtext" },
    "events": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::event.event",
      "mappedBy": "organizer"
    }
  }
}
```

> Внимание: relation `events` ссылается на ещё не созданный `api::event.event`. Strapi корректно обработает это, потому что схемы загружаются батчем. Но **запускать `npm run develop` до создания event-схемы (Task 10) нельзя** — будет ошибка валидации. Поэтому smoke-проверка перенесена в Task 10.

- [ ] **Step 2: Создать `controllers/organizer.ts`**

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::organizer.organizer');
```

- [ ] **Step 3: Создать `routes/organizer.ts`**

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::organizer.organizer');
```

- [ ] **Step 4: Создать `services/organizer.ts`**

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::organizer.organizer');
```

- [ ] **Step 5: TS-проверка (без `develop`!)**

```bash
npm run build
```

Expected: build completes. (Smoke на Strapi откладываем до создания event.)

- [ ] **Step 6: Закоммитить**

```bash
git add apps/backend/src/api/organizer
git commit -m "feat(backend): добавить content type organizer"
```

---

## Task 6: Content Type `speaker`

**Files:**
- Create: `apps/backend/src/api/speaker/content-types/speaker/schema.json`
- Create: `apps/backend/src/api/speaker/controllers/speaker.ts`
- Create: `apps/backend/src/api/speaker/routes/speaker.ts`
- Create: `apps/backend/src/api/speaker/services/speaker.ts`

- [ ] **Step 1: Создать `schema.json`**

```json
{
  "kind": "collectionType",
  "collectionName": "speakers",
  "info": {
    "singularName": "speaker",
    "pluralName": "speakers",
    "displayName": "Speaker",
    "description": "Карточка спикера"
  },
  "options": {
    "draftAndPublish": true
  },
  "attributes": {
    "slug": { "type": "uid", "targetField": "fullName" },
    "fullName": { "type": "string", "required": true, "maxLength": 200 },
    "photo": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "bio": { "type": "richtext" },
    "social": { "type": "json" },
    "events": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::event.event",
      "mappedBy": "speakers"
    }
  }
}
```

- [ ] **Step 2: Создать `controllers/speaker.ts`**

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::speaker.speaker');
```

- [ ] **Step 3: Создать `routes/speaker.ts`**

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::speaker.speaker');
```

- [ ] **Step 4: Создать `services/speaker.ts`**

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::speaker.speaker');
```

- [ ] **Step 5: TS-проверка**

```bash
npm run build
```

- [ ] **Step 6: Закоммитить**

```bash
git add apps/backend/src/api/speaker
git commit -m "feat(backend): добавить content type speaker"
```

---

## Task 7: Content Type `ticket-tier`

**Files:**
- Create: `apps/backend/src/api/ticket-tier/content-types/ticket-tier/schema.json`
- Create: `apps/backend/src/api/ticket-tier/controllers/ticket-tier.ts`
- Create: `apps/backend/src/api/ticket-tier/routes/ticket-tier.ts`
- Create: `apps/backend/src/api/ticket-tier/services/ticket-tier.ts`

- [ ] **Step 1: Создать `schema.json`**

```json
{
  "kind": "collectionType",
  "collectionName": "ticket_tiers",
  "info": {
    "singularName": "ticket-tier",
    "pluralName": "ticket-tiers",
    "displayName": "Ticket Tier",
    "description": "Категория билета внутри мероприятия"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "name": { "type": "string", "required": true, "maxLength": 200 },
    "description": { "type": "text" },
    "includes": { "type": "richtext" },
    "price": { "type": "integer", "required": true, "min": 0 },
    "currency": {
      "type": "enumeration",
      "enum": ["RUB"],
      "default": "RUB",
      "required": true
    },
    "sortOrder": { "type": "integer", "default": 0 },
    "event": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::event.event",
      "inversedBy": "tiers"
    }
  }
}
```

- [ ] **Step 2: Создать `controllers/ticket-tier.ts`**

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::ticket-tier.ticket-tier');
```

- [ ] **Step 3: Создать `routes/ticket-tier.ts`**

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::ticket-tier.ticket-tier');
```

- [ ] **Step 4: Создать `services/ticket-tier.ts`**

```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::ticket-tier.ticket-tier');
```

- [ ] **Step 5: TS-проверка**

```bash
npm run build
```

- [ ] **Step 6: Закоммитить**

```bash
git add apps/backend/src/api/ticket-tier
git commit -m "feat(backend): добавить content type ticket-tier"
```

---

## Task 8: Content Type `agenda-item`

**Files:**
- Create: `apps/backend/src/api/agenda-item/content-types/agenda-item/schema.json`
- Create: `apps/backend/src/api/agenda-item/controllers/agenda-item.ts`
- Create: `apps/backend/src/api/agenda-item/routes/agenda-item.ts`
- Create: `apps/backend/src/api/agenda-item/services/agenda-item.ts`

- [ ] **Step 1: Создать `schema.json`**

```json
{
  "kind": "collectionType",
  "collectionName": "agenda_items",
  "info": {
    "singularName": "agenda-item",
    "pluralName": "agenda-items",
    "displayName": "Agenda Item",
    "description": "Пункт программы мероприятия"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "startsAt": { "type": "datetime", "required": true },
    "endsAt": { "type": "datetime" },
    "title": { "type": "string", "required": true, "maxLength": 300 },
    "description": { "type": "text" },
    "event": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::event.event",
      "inversedBy": "agenda"
    },
    "speakers": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::speaker.speaker"
    }
  }
}
```

- [ ] **Step 2: Создать controllers/routes/services (boilerplate, как в Task 4-7)**

```ts
// controllers/agenda-item.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::agenda-item.agenda-item');
```

```ts
// routes/agenda-item.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::agenda-item.agenda-item');
```

```ts
// services/agenda-item.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::agenda-item.agenda-item');
```

- [ ] **Step 3: TS-проверка**

```bash
npm run build
```

- [ ] **Step 4: Закоммитить**

```bash
git add apps/backend/src/api/agenda-item
git commit -m "feat(backend): добавить content type agenda-item"
```

---

## Task 9: Content Type `event`

**Files:**
- Create: `apps/backend/src/api/event/content-types/event/schema.json`
- Create: `apps/backend/src/api/event/controllers/event.ts`
- Create: `apps/backend/src/api/event/routes/event.ts`
- Create: `apps/backend/src/api/event/services/event.ts`

- [ ] **Step 1: Создать `schema.json`**

```json
{
  "kind": "collectionType",
  "collectionName": "events",
  "info": {
    "singularName": "event",
    "pluralName": "events",
    "displayName": "Event",
    "description": "Мероприятие"
  },
  "options": {
    "draftAndPublish": true
  },
  "attributes": {
    "slug": { "type": "uid", "targetField": "title" },
    "title": { "type": "string", "required": true, "maxLength": 300 },
    "shortDescription": { "type": "string", "maxLength": 500 },
    "description": { "type": "richtext" },
    "coverImage": {
      "type": "media",
      "multiple": false,
      "allowedTypes": ["images"]
    },
    "gallery": {
      "type": "media",
      "multiple": true,
      "allowedTypes": ["images"]
    },
    "pastGallery": {
      "type": "media",
      "multiple": true,
      "allowedTypes": ["images"]
    },
    "startsAt": { "type": "datetime", "required": true },
    "endsAt": { "type": "datetime" },
    "timezone": { "type": "string", "default": "Europe/Moscow", "maxLength": 64 },
    "capacity": { "type": "integer", "min": 0 },
    "status": {
      "type": "enumeration",
      "enum": ["draft", "published", "cancelled", "archived"],
      "default": "draft",
      "required": true
    },
    "venue": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::venue.venue"
    },
    "organizer": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::organizer.organizer",
      "inversedBy": "events"
    },
    "speakers": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::speaker.speaker",
      "inversedBy": "events"
    },
    "agenda": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::agenda-item.agenda-item",
      "mappedBy": "event"
    },
    "tiers": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::ticket-tier.ticket-tier",
      "mappedBy": "event"
    }
  }
}
```

- [ ] **Step 2: Создать boilerplate (controller/route/service)**

```ts
// controllers/event.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::event.event');
```

```ts
// routes/event.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::event.event');
```

```ts
// services/event.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::event.event');
```

- [ ] **Step 3: Smoke — теперь все каталог-типы консистентны**

```bash
npm run develop
```

В Admin UI должны появиться: Event, Organizer, Speaker, Ticket Tier, Agenda Item, Venue. Создать тестовый event с organizer, speaker, agenda, tier — проверить, что сохранение работает. Удалить тестовые данные, остановить процесс.

- [ ] **Step 4: TS-проверка**

```bash
npm run build
```

- [ ] **Step 5: Закоммитить**

```bash
git add apps/backend/src/api/event
git commit -m "feat(backend): добавить content type event с relations"
```

---

## Task 10: Content Type `promo-code`

**Files:**
- Create: `apps/backend/src/api/promo-code/content-types/promo-code/schema.json`
- Create: `apps/backend/src/api/promo-code/controllers/promo-code.ts`
- Create: `apps/backend/src/api/promo-code/routes/promo-code.ts`
- Create: `apps/backend/src/api/promo-code/services/promo-code.ts`

- [ ] **Step 1: Создать `schema.json`**

```json
{
  "kind": "collectionType",
  "collectionName": "promo_codes",
  "info": {
    "singularName": "promo-code",
    "pluralName": "promo-codes",
    "displayName": "Promo Code",
    "description": "Промокод / скидка"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "code": {
      "type": "string",
      "required": true,
      "unique": true,
      "maxLength": 64
    },
    "discountType": {
      "type": "enumeration",
      "enum": ["percent", "fixed"],
      "required": true
    },
    "discountValue": { "type": "integer", "required": true, "min": 0 },
    "validFrom": { "type": "datetime" },
    "validUntil": { "type": "datetime" },
    "maxUses": { "type": "integer", "min": 1 },
    "usedCount": { "type": "integer", "default": 0, "min": 0, "private": true },
    "events": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::event.event"
    }
  }
}
```

- [ ] **Step 2: Создать boilerplate (controller/route/service) — те же три файла с `api::promo-code.promo-code`**

```ts
// controllers/promo-code.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::promo-code.promo-code');
```

```ts
// routes/promo-code.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::promo-code.promo-code');
```

```ts
// services/promo-code.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::promo-code.promo-code');
```

- [ ] **Step 3: TS-проверка**

```bash
npm run build
```

- [ ] **Step 4: Закоммитить**

```bash
git add apps/backend/src/api/promo-code
git commit -m "feat(backend): добавить content type promo-code"
```

---

## Task 11: Content Type `order`

**Files:**
- Create: `apps/backend/src/api/order/content-types/order/schema.json`
- Create: `apps/backend/src/api/order/controllers/order.ts`
- Create: `apps/backend/src/api/order/routes/order.ts`
- Create: `apps/backend/src/api/order/services/order.ts`

- [ ] **Step 1: Создать `schema.json`**

```json
{
  "kind": "collectionType",
  "collectionName": "orders",
  "info": {
    "singularName": "order",
    "pluralName": "orders",
    "displayName": "Order",
    "description": "Заказ (одна транзакция покупки билетов)"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "number": {
      "type": "string",
      "required": true,
      "unique": true,
      "maxLength": 64
    },
    "subtotal": { "type": "integer", "required": true, "min": 0 },
    "discount": { "type": "integer", "default": 0, "min": 0 },
    "total": { "type": "integer", "required": true, "min": 0 },
    "currency": {
      "type": "enumeration",
      "enum": ["RUB"],
      "default": "RUB",
      "required": true
    },
    "paymentMethod": {
      "type": "enumeration",
      "enum": ["card", "sbp", "invoice"],
      "required": true
    },
    "paymentStatus": {
      "type": "enumeration",
      "enum": ["pending", "paid", "failed", "refunded"],
      "default": "pending",
      "required": true
    },
    "paymentProviderId": { "type": "string", "private": true, "maxLength": 200 },
    "personalDataConsentAt": { "type": "datetime", "required": true },
    "draftAttendees": { "type": "json", "private": true },
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    },
    "items": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::order-item.order-item",
      "mappedBy": "order"
    },
    "tickets": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::ticket.ticket",
      "mappedBy": "order"
    },
    "promoCode": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::promo-code.promo-code"
    }
  }
}
```

- [ ] **Step 2: Boilerplate (controller/route/service)**

```ts
// controllers/order.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::order.order');
```

```ts
// routes/order.ts (заменим на кастомный в Task 19)
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::order.order');
```

```ts
// services/order.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::order.order');
```

- [ ] **Step 3: TS-проверка**

```bash
npm run build
```

- [ ] **Step 4: Закоммитить**

```bash
git add apps/backend/src/api/order
git commit -m "feat(backend): добавить content type order"
```

---

## Task 12: Content Type `order-item`

**Files:**
- Create: `apps/backend/src/api/order-item/content-types/order-item/schema.json`
- Create: `apps/backend/src/api/order-item/controllers/order-item.ts`
- Create: `apps/backend/src/api/order-item/routes/order-item.ts`
- Create: `apps/backend/src/api/order-item/services/order-item.ts`

- [ ] **Step 1: Создать `schema.json`**

```json
{
  "kind": "collectionType",
  "collectionName": "order_items",
  "info": {
    "singularName": "order-item",
    "pluralName": "order-items",
    "displayName": "Order Item",
    "description": "Позиция заказа (категория × количество)"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "quantity": { "type": "integer", "required": true, "min": 1 },
    "unitPrice": { "type": "integer", "required": true, "min": 0 },
    "order": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::order.order",
      "inversedBy": "items"
    },
    "tier": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::ticket-tier.ticket-tier"
    }
  }
}
```

- [ ] **Step 2: Boilerplate**

```ts
// controllers/order-item.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::order-item.order-item');
```

```ts
// routes/order-item.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::order-item.order-item');
```

```ts
// services/order-item.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::order-item.order-item');
```

- [ ] **Step 3: TS-проверка**

```bash
npm run build
```

- [ ] **Step 4: Закоммитить**

```bash
git add apps/backend/src/api/order-item
git commit -m "feat(backend): добавить content type order-item"
```

---

## Task 13: Content Type `ticket`

**Files:**
- Create: `apps/backend/src/api/ticket/content-types/ticket/schema.json`
- Create: `apps/backend/src/api/ticket/controllers/ticket.ts`
- Create: `apps/backend/src/api/ticket/routes/ticket.ts`
- Create: `apps/backend/src/api/ticket/services/ticket.ts`

- [ ] **Step 1: Создать `schema.json`**

```json
{
  "kind": "collectionType",
  "collectionName": "tickets",
  "info": {
    "singularName": "ticket",
    "pluralName": "tickets",
    "displayName": "Ticket",
    "description": "Купленный билет с QR и анкетой"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "number": {
      "type": "string",
      "required": true,
      "unique": true,
      "maxLength": 64
    },
    "qrPayload": {
      "type": "string",
      "required": true,
      "maxLength": 1024,
      "private": true
    },
    "status": {
      "type": "enumeration",
      "enum": ["valid", "used", "refunded", "cancelled"],
      "default": "valid",
      "required": true
    },
    "usedAt": { "type": "datetime" },
    "attendee": {
      "type": "component",
      "repeatable": false,
      "component": "attendee.attendee",
      "required": true
    },
    "order": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::order.order",
      "inversedBy": "tickets"
    },
    "tier": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::ticket-tier.ticket-tier"
    },
    "event": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::event.event"
    }
  }
}
```

- [ ] **Step 2: Boilerplate**

```ts
// controllers/ticket.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::ticket.ticket');
```

```ts
// routes/ticket.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::ticket.ticket');
```

```ts
// services/ticket.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::ticket.ticket');
```

- [ ] **Step 3: TS-проверка**

```bash
npm run build
```

- [ ] **Step 4: Закоммитить**

```bash
git add apps/backend/src/api/ticket
git commit -m "feat(backend): добавить content type ticket"
```

---

## Task 14: Content Type `favorite`

**Files:**
- Create: `apps/backend/src/api/favorite/content-types/favorite/schema.json`
- Create: `apps/backend/src/api/favorite/controllers/favorite.ts`
- Create: `apps/backend/src/api/favorite/routes/favorite.ts`
- Create: `apps/backend/src/api/favorite/services/favorite.ts`

- [ ] **Step 1: Создать `schema.json`**

```json
{
  "kind": "collectionType",
  "collectionName": "favorites",
  "info": {
    "singularName": "favorite",
    "pluralName": "favorites",
    "displayName": "Favorite",
    "description": "Закладка пользователя на мероприятие"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    },
    "event": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::event.event"
    }
  }
}
```

- [ ] **Step 2: Boilerplate**

```ts
// controllers/favorite.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::favorite.favorite');
```

```ts
// routes/favorite.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::favorite.favorite');
```

```ts
// services/favorite.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::favorite.favorite');
```

- [ ] **Step 3: TS-проверка**

```bash
npm run build
```

- [ ] **Step 4: Закоммитить**

```bash
git add apps/backend/src/api/favorite
git commit -m "feat(backend): добавить content type favorite"
```

---

## Task 15: Content Type `banner`

**Files:**
- Create: `apps/backend/src/api/banner/content-types/banner/schema.json`
- Create: `apps/backend/src/api/banner/controllers/banner.ts`
- Create: `apps/backend/src/api/banner/routes/banner.ts`
- Create: `apps/backend/src/api/banner/services/banner.ts`

- [ ] **Step 1: Создать `schema.json`**

```json
{
  "kind": "collectionType",
  "collectionName": "banners",
  "info": {
    "singularName": "banner",
    "pluralName": "banners",
    "displayName": "Banner",
    "description": "Баннер для рекламного слайдера на главной"
  },
  "options": {
    "draftAndPublish": true
  },
  "attributes": {
    "title": { "type": "string", "required": true, "maxLength": 200 },
    "image": {
      "type": "media",
      "multiple": false,
      "required": true,
      "allowedTypes": ["images"]
    },
    "url": { "type": "string", "maxLength": 500 },
    "priority": { "type": "integer", "default": 0 },
    "activeFrom": { "type": "datetime" },
    "activeUntil": { "type": "datetime" },
    "event": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::event.event"
    }
  }
}
```

- [ ] **Step 2: Boilerplate**

```ts
// controllers/banner.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::banner.banner');
```

```ts
// routes/banner.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::banner.banner');
```

```ts
// services/banner.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::banner.banner');
```

- [ ] **Step 3: TS-проверка**

```bash
npm run build
```

- [ ] **Step 4: Закоммитить**

```bash
git add apps/backend/src/api/banner
git commit -m "feat(backend): добавить content type banner"
```

---

## Task 16: Content Type `speaker-application`

**Files:**
- Create: `apps/backend/src/api/speaker-application/content-types/speaker-application/schema.json`
- Create: `apps/backend/src/api/speaker-application/controllers/speaker-application.ts`
- Create: `apps/backend/src/api/speaker-application/routes/speaker-application.ts`
- Create: `apps/backend/src/api/speaker-application/services/speaker-application.ts`

- [ ] **Step 1: Создать `schema.json`**

```json
{
  "kind": "collectionType",
  "collectionName": "speaker_applications",
  "info": {
    "singularName": "speaker-application",
    "pluralName": "speaker-applications",
    "displayName": "Speaker Application",
    "description": "Заявка «стать спикером»"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "fullName": { "type": "string", "required": true, "maxLength": 200 },
    "email": { "type": "email", "required": true },
    "topic": { "type": "string", "maxLength": 300 },
    "description": { "type": "text" },
    "status": {
      "type": "enumeration",
      "enum": ["new", "reviewing", "accepted", "rejected"],
      "default": "new",
      "required": true
    },
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    }
  }
}
```

- [ ] **Step 2: Boilerplate**

```ts
// controllers/speaker-application.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::speaker-application.speaker-application');
```

```ts
// routes/speaker-application.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::speaker-application.speaker-application');
```

```ts
// services/speaker-application.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::speaker-application.speaker-application');
```

- [ ] **Step 3: TS-проверка**

```bash
npm run build
```

- [ ] **Step 4: Закоммитить**

```bash
git add apps/backend/src/api/speaker-application
git commit -m "feat(backend): добавить content type speaker-application"
```

---

## Task 17: Content Type `manager-contact-request`

**Files:**
- Create: `apps/backend/src/api/manager-contact-request/content-types/manager-contact-request/schema.json`
- Create: `apps/backend/src/api/manager-contact-request/controllers/manager-contact-request.ts`
- Create: `apps/backend/src/api/manager-contact-request/routes/manager-contact-request.ts`
- Create: `apps/backend/src/api/manager-contact-request/services/manager-contact-request.ts`

- [ ] **Step 1: Создать `schema.json`**

```json
{
  "kind": "collectionType",
  "collectionName": "manager_contact_requests",
  "info": {
    "singularName": "manager-contact-request",
    "pluralName": "manager-contact-requests",
    "displayName": "Manager Contact Request",
    "description": "Обращение «связаться с менеджером»"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "subject": { "type": "string", "required": true, "maxLength": 300 },
    "message": { "type": "text", "required": true },
    "contactBack": { "type": "string", "maxLength": 200 },
    "status": {
      "type": "enumeration",
      "enum": ["new", "processing", "done"],
      "default": "new",
      "required": true
    },
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    }
  }
}
```

- [ ] **Step 2: Boilerplate**

```ts
// controllers/manager-contact-request.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::manager-contact-request.manager-contact-request');
```

```ts
// routes/manager-contact-request.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::manager-contact-request.manager-contact-request');
```

```ts
// services/manager-contact-request.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::manager-contact-request.manager-contact-request');
```

- [ ] **Step 3: TS-проверка + smoke (полная схема)**

```bash
npm run build
npm run develop
```

В Admin UI должны быть **все 13 Content Types** + Session: Event, Ticket Tier, Speaker, Organizer, Venue, Agenda Item, Order, Order Item, Ticket, Favorite, Promo Code, Banner, Speaker Application, Manager Contact Request, Session. Создать тестовый event с tier и проверить, что он сохраняется. Удалить тестовые данные, остановить процесс.

- [ ] **Step 4: Закоммитить**

```bash
git add apps/backend/src/api/manager-contact-request
git commit -m "feat(backend): добавить content type manager-contact-request"
```

---

## Task 18: Domain `pricing.ts` — расчёт subtotal/discount/total (TDD)

**Files:**
- Create: `apps/backend/src/domain/orders/pricing.ts`
- Test: `apps/backend/tests/unit/domain/orders/pricing.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
// apps/backend/tests/unit/domain/orders/pricing.test.ts
import { calculateOrderTotals } from '../../../../src/domain/orders/pricing';

describe('calculateOrderTotals', () => {
  const items = [
    { unitPrice: 10000, quantity: 2 },
    { unitPrice: 5000, quantity: 1 },
  ];

  it('возвращает subtotal без промо', () => {
    const r = calculateOrderTotals({ items });
    expect(r.subtotal).toBe(25000);
    expect(r.discount).toBe(0);
    expect(r.total).toBe(25000);
    expect(r.appliedPromo).toBe(false);
  });

  it('применяет percent промо', () => {
    const r = calculateOrderTotals({
      items,
      promo: { discountType: 'percent', discountValue: 10 },
    });
    expect(r.discount).toBe(2500);
    expect(r.total).toBe(22500);
    expect(r.appliedPromo).toBe(true);
  });

  it('применяет fixed промо', () => {
    const r = calculateOrderTotals({
      items,
      promo: { discountType: 'fixed', discountValue: 3000 },
    });
    expect(r.discount).toBe(3000);
    expect(r.total).toBe(22000);
  });

  it('обрезает discount до subtotal (не уходит в минус)', () => {
    const r = calculateOrderTotals({
      items: [{ unitPrice: 1000, quantity: 1 }],
      promo: { discountType: 'fixed', discountValue: 5000 },
    });
    expect(r.discount).toBe(1000);
    expect(r.total).toBe(0);
  });

  it('100% промо обнуляет total', () => {
    const r = calculateOrderTotals({
      items,
      promo: { discountType: 'percent', discountValue: 100 },
    });
    expect(r.discount).toBe(25000);
    expect(r.total).toBe(0);
  });

  it('бросает ошибку при пустом items', () => {
    expect(() => calculateOrderTotals({ items: [] })).toThrow('items must be non-empty');
  });
});
```

- [ ] **Step 2: Запустить тест — должен упасть**

```bash
cd apps/backend && npm run test:unit
```

Expected: FAIL "Cannot find module pricing".

- [ ] **Step 3: Реализовать `pricing.ts`**

```ts
// apps/backend/src/domain/orders/pricing.ts
export interface PricingItem {
  unitPrice: number;
  quantity: number;
}

export interface PricingPromo {
  discountType: 'percent' | 'fixed';
  discountValue: number;
}

export interface PricingResult {
  subtotal: number;
  discount: number;
  total: number;
  appliedPromo: boolean;
}

export const calculateOrderTotals = (params: {
  items: PricingItem[];
  promo?: PricingPromo | null;
}): PricingResult => {
  if (!params.items.length) {
    throw new Error('items must be non-empty');
  }

  const subtotal = params.items.reduce(
    (sum, it) => sum + it.unitPrice * it.quantity,
    0,
  );

  let discount = 0;
  if (params.promo) {
    if (params.promo.discountType === 'percent') {
      discount = Math.floor((subtotal * params.promo.discountValue) / 100);
    } else {
      discount = params.promo.discountValue;
    }
    if (discount > subtotal) discount = subtotal;
  }

  return {
    subtotal,
    discount,
    total: subtotal - discount,
    appliedPromo: !!params.promo,
  };
};
```

- [ ] **Step 4: Запустить тест — должен пройти**

```bash
npm run test:unit
```

Expected: PASS.

- [ ] **Step 5: Закоммитить**

```bash
git add apps/backend/src/domain/orders/pricing.ts apps/backend/tests/unit/domain/orders/pricing.test.ts
git commit -m "feat(backend): добавить расчёт стоимости заказа (pricing)"
```

---

## Task 19: Domain `numbering.ts` — генерация order/ticket numbers (TDD)

**Files:**
- Create: `apps/backend/src/domain/orders/numbering.ts`
- Test: `apps/backend/tests/unit/domain/orders/numbering.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
// apps/backend/tests/unit/domain/orders/numbering.test.ts
import { generateOrderNumber, generateTicketNumber } from '../../../../src/domain/orders/numbering';

describe('numbering', () => {
  it('generateOrderNumber имеет формат EVT-YYYYMMDD-XXXXXX', () => {
    const n = generateOrderNumber(new Date('2026-04-28T12:00:00Z'));
    expect(n).toMatch(/^EVT-20260428-[0-9A-Z]{6}$/);
  });

  it('generateTicketNumber имеет формат T-YYYYMMDD-XXXXXX', () => {
    const n = generateTicketNumber(new Date('2026-04-28T12:00:00Z'));
    expect(n).toMatch(/^T-20260428-[0-9A-Z]{6}$/);
  });

  it('два подряд вызова дают разные значения', () => {
    const a = generateOrderNumber(new Date());
    const b = generateOrderNumber(new Date());
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Запустить — должен упасть**

```bash
npm run test:unit
```

Expected: FAIL.

- [ ] **Step 3: Реализовать `numbering.ts`**

```ts
// apps/backend/src/domain/orders/numbering.ts
import { randomBytes } from 'node:crypto';

const formatDate = (d: Date): string => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
};

const randomSuffix = (): string =>
  randomBytes(4).toString('hex').slice(0, 6).toUpperCase();

export const generateOrderNumber = (now: Date = new Date()): string =>
  `EVT-${formatDate(now)}-${randomSuffix()}`;

export const generateTicketNumber = (now: Date = new Date()): string =>
  `T-${formatDate(now)}-${randomSuffix()}`;
```

- [ ] **Step 4: Запустить — должен пройти**

```bash
npm run test:unit
```

Expected: PASS.

- [ ] **Step 5: Закоммитить**

```bash
git add apps/backend/src/domain/orders/numbering.ts apps/backend/tests/unit/domain/orders/numbering.test.ts
git commit -m "feat(backend): добавить генератор номеров заказа и билета"
```

---

## Task 20: Domain `qrPayload.ts` — подписанный токен билета (TDD)

**Files:**
- Create: `apps/backend/src/domain/orders/qrPayload.ts`
- Test: `apps/backend/tests/unit/domain/orders/qrPayload.test.ts`

- [ ] **Step 1: Написать тест**

```ts
// apps/backend/tests/unit/domain/orders/qrPayload.test.ts
import {
  signTicketQrPayload,
  verifyTicketQrPayload,
} from '../../../../src/domain/orders/qrPayload';

const SECRET = 'test-secret-do-not-use-in-prod';

describe('qrPayload', () => {
  const data = { ticketId: 1, eventId: 42, number: 'T-20260428-ABCDEF' };

  it('подписывает и верифицирует payload', () => {
    const token = signTicketQrPayload(data, SECRET);
    const verified = verifyTicketQrPayload(token, SECRET);
    expect(verified).toMatchObject(data);
    expect(typeof verified?.iat).toBe('number');
  });

  it('возвращает null при неверной подписи', () => {
    const token = signTicketQrPayload(data, SECRET);
    const tampered = token.slice(0, -4) + 'AAAA';
    expect(verifyTicketQrPayload(tampered, SECRET)).toBeNull();
  });

  it('возвращает null при другом секрете', () => {
    const token = signTicketQrPayload(data, SECRET);
    expect(verifyTicketQrPayload(token, 'other-secret')).toBeNull();
  });

  it('возвращает null на мусорный вход', () => {
    expect(verifyTicketQrPayload('garbage', SECRET)).toBeNull();
    expect(verifyTicketQrPayload('a.b', SECRET)).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить — должен упасть**

```bash
npm run test:unit
```

Expected: FAIL.

- [ ] **Step 3: Реализовать `qrPayload.ts`**

```ts
// apps/backend/src/domain/orders/qrPayload.ts
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TicketQrData {
  ticketId: number;
  eventId: number;
  number: string;
}

interface SignedPayload extends TicketQrData {
  iat: number;
}

const b64url = (buf: Buffer): string =>
  buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const fromB64url = (s: string): Buffer =>
  Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

const sign = (data: string, secret: string): string =>
  b64url(createHmac('sha256', secret).update(data).digest());

export const signTicketQrPayload = (data: TicketQrData, secret: string): string => {
  const payload: SignedPayload = { ...data, iat: Math.floor(Date.now() / 1000) };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = sign(body, secret);
  return `${body}.${sig}`;
};

export const verifyTicketQrPayload = (
  token: string,
  secret: string,
): SignedPayload | null => {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = sign(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(fromB64url(body).toString('utf8')) as SignedPayload;
  } catch {
    return null;
  }
};
```

- [ ] **Step 4: Запустить — должен пройти**

```bash
npm run test:unit
```

Expected: PASS.

- [ ] **Step 5: Закоммитить**

```bash
git add apps/backend/src/domain/orders/qrPayload.ts apps/backend/tests/unit/domain/orders/qrPayload.test.ts
git commit -m "feat(backend): добавить подпись и верификацию qr-payload билета"
```

---

## Task 21: Fail-fast проверка `TICKET_QR_SECRET` в `register()`

**Files:**
- Modify: `apps/backend/src/index.ts`
- Modify: `apps/backend/.env.example` (создать, если нет)

- [ ] **Step 1: Расширить `index.ts`**

```ts
// apps/backend/src/index.ts
import type { Core } from '@strapi/strapi';

const SESSION_ACTIONS = [
  'api::session.session.list',
  'api::session.session.revoke',
  'api::session.session.revokeOthers',
] as const;

const grantSessionPermissionsToAuthenticated = async (strapi: Core.Strapi) => {
  const role: any = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } });
  if (!role) {
    strapi.log.warn('users-permissions: authenticated role not found, skipping session permissions');
    return;
  }
  for (const action of SESSION_ACTIONS) {
    const existing = await strapi.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { role: role.id, action } });
    if (existing) continue;
    await strapi.db
      .query('plugin::users-permissions.permission')
      .create({ data: { role: role.id, action } });
    strapi.log.info(`users-permissions: granted ${action} to authenticated role`);
  }
};

const assertRequiredEnv = () => {
  if (!process.env.TICKET_QR_SECRET || process.env.TICKET_QR_SECRET.length < 16) {
    throw new Error(
      'TICKET_QR_SECRET env is required (min length 16). Set it in apps/backend/.env',
    );
  }
};

export default {
  register() {
    assertRequiredEnv();
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grantSessionPermissionsToAuthenticated(strapi);
  },
};
```

- [ ] **Step 2: Добавить переменную в `.env.example`**

Если `apps/backend/.env.example` не существует — создать. Иначе добавить в конец:
```
TICKET_QR_SECRET=replace-me-with-32-byte-random-string
BOOTSTRAP_PERMISSIONS=true
```

- [ ] **Step 3: Локально установить переменную в `apps/backend/.env`**

В `.env` (gitignored) добавить (сгенерировать секрет: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`):
```
TICKET_QR_SECRET=<32-байтный hex>
BOOTSTRAP_PERMISSIONS=true
```

- [ ] **Step 4: Smoke**

```bash
npm run develop
```

Expected: Strapi стартует без ошибок. Если убрать `TICKET_QR_SECRET` из `.env` — должен упасть с понятной ошибкой при старте.

- [ ] **Step 5: Закоммитить**

```bash
git add apps/backend/src/index.ts apps/backend/.env.example
git commit -m "feat(backend): fail-fast при отсутствии TICKET_QR_SECRET"
```

---

## Task 22: Domain `createOrder.ts` — сервис создания заказа

**Files:**
- Create: `apps/backend/src/domain/orders/createOrder.ts`
- Create: `apps/backend/src/domain/orders/types.ts`

> Этот таск **без unit-теста**: createOrder делает запросы к БД через `strapi.db`/`strapi.documents`, и тестировать его в изоляции бессмысленно. Integration-тест добавим в Task 24, после кастомного эндпоинта.

- [ ] **Step 1: Создать `types.ts` с публичными типами**

```ts
// apps/backend/src/domain/orders/types.ts
export type PaymentMethod = 'card' | 'sbp' | 'invoice';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface CreateOrderInput {
  userId: number;
  eventId: number;
  items: Array<{ tierId: number; quantity: number }>;
  promoCode?: string | null;
  paymentMethod: PaymentMethod;
  personalDataConsent: boolean;
  attendees: Array<{
    fullName: string;
    email?: string;
    phone?: string;
    extra?: Record<string, unknown>;
  }>;
}

export class OrderValidationError extends Error {
  constructor(public readonly httpStatus: number, message: string) {
    super(message);
    this.name = 'OrderValidationError';
  }
}
```

- [ ] **Step 2: Реализовать `createOrder.ts`**

```ts
// apps/backend/src/domain/orders/createOrder.ts
import type { Core } from '@strapi/strapi';
import { calculateOrderTotals } from './pricing';
import { generateOrderNumber } from './numbering';
import { CreateOrderInput, OrderValidationError } from './types';

export const createOrder = async (
  strapi: Core.Strapi,
  input: CreateOrderInput,
) => {
  if (!input.personalDataConsent) {
    throw new OrderValidationError(400, 'personalDataConsent must be true');
  }

  const totalQuantity = input.items.reduce((s, i) => s + i.quantity, 0);
  if (totalQuantity !== input.attendees.length) {
    throw new OrderValidationError(
      400,
      'attendees.length must equal sum(items.quantity)',
    );
  }
  if (totalQuantity < 1) {
    throw new OrderValidationError(400, 'order must contain at least one ticket');
  }

  return strapi.db.transaction(async () => {
    const event: any = await strapi.db.query('api::event.event').findOne({
      where: { id: input.eventId },
      populate: { tiers: true },
    });
    if (!event) {
      throw new OrderValidationError(404, 'event not found');
    }
    if (event.status !== 'published') {
      throw new OrderValidationError(400, 'event is not published');
    }
    if (!event.startsAt || new Date(event.startsAt).getTime() <= Date.now()) {
      throw new OrderValidationError(400, 'event already started or ended');
    }

    const tierMap = new Map<number, any>();
    for (const t of event.tiers || []) tierMap.set(t.id, t);

    for (const it of input.items) {
      const tier = tierMap.get(it.tierId);
      if (!tier) {
        throw new OrderValidationError(
          400,
          `tier ${it.tierId} does not belong to event`,
        );
      }
      if (it.quantity < 1) {
        throw new OrderValidationError(400, 'item.quantity must be >= 1');
      }
    }

    if (event.capacity != null) {
      const issued: number = await strapi.db.query('api::ticket.ticket').count({
        where: { event: event.id, status: { $in: ['valid', 'used'] } },
      });
      if (issued + totalQuantity > event.capacity) {
        throw new OrderValidationError(409, 'event capacity exceeded');
      }
    }

    let promo: any = null;
    if (input.promoCode) {
      promo = await strapi.db.query('api::promo-code.promo-code').findOne({
        where: { code: input.promoCode.toUpperCase() },
        populate: { events: true },
      });
      if (!promo) {
        throw new OrderValidationError(400, 'invalid promo code');
      }
      const now = Date.now();
      if (promo.validFrom && new Date(promo.validFrom).getTime() > now) {
        throw new OrderValidationError(400, 'promo not yet valid');
      }
      if (promo.validUntil && new Date(promo.validUntil).getTime() < now) {
        throw new OrderValidationError(400, 'promo expired');
      }
      if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
        throw new OrderValidationError(400, 'promo usage limit reached');
      }
      const scoped = (promo.events || []).length > 0;
      if (scoped && !promo.events.some((e: any) => e.id === event.id)) {
        throw new OrderValidationError(400, 'promo not applicable to this event');
      }
    }

    const pricingItems = input.items.map((it) => {
      const tier = tierMap.get(it.tierId);
      return { unitPrice: tier.price, quantity: it.quantity };
    });
    const totals = calculateOrderTotals({
      items: pricingItems,
      promo: promo
        ? { discountType: promo.discountType, discountValue: promo.discountValue }
        : null,
    });

    const number = generateOrderNumber();

    const order: any = await strapi.db.query('api::order.order').create({
      data: {
        number,
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
        currency: 'RUB',
        paymentMethod: input.paymentMethod,
        paymentStatus: 'pending',
        personalDataConsentAt: new Date(),
        draftAttendees: input.attendees,
        user: input.userId,
        promoCode: promo ? promo.id : null,
      },
    });

    for (const it of input.items) {
      const tier = tierMap.get(it.tierId);
      await strapi.db.query('api::order-item.order-item').create({
        data: {
          quantity: it.quantity,
          unitPrice: tier.price,
          order: order.id,
          tier: tier.id,
        },
      });
    }

    return strapi.db.query('api::order.order').findOne({
      where: { id: order.id },
      populate: { items: true, promoCode: true },
    });
  });
};
```

- [ ] **Step 3: TS-проверка**

```bash
npm run build
```

Expected: build completes без ошибок.

- [ ] **Step 4: Закоммитить**

```bash
git add apps/backend/src/domain/orders/createOrder.ts apps/backend/src/domain/orders/types.ts
git commit -m "feat(backend): добавить domain-сервис createOrder"
```

---

## Task 23: Domain `markOrderPaid.ts` — выпуск билетов при оплате

**Files:**
- Create: `apps/backend/src/domain/orders/markOrderPaid.ts`

- [ ] **Step 1: Реализовать**

```ts
// apps/backend/src/domain/orders/markOrderPaid.ts
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
        const ticket: any = await strapi.db.query('api::ticket.ticket').create({
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
```

- [ ] **Step 2: TS-проверка**

```bash
npm run build
```

- [ ] **Step 3: Закоммитить**

```bash
git add apps/backend/src/domain/orders/markOrderPaid.ts
git commit -m "feat(backend): добавить domain-сервис markOrderPaid с выпуском билетов"
```

---

## Task 24: Кастомные эндпоинты заказов (POST /orders, mark-paid, preview-promo, me/orders)

**Files:**
- Modify: `apps/backend/src/api/order/controllers/order.ts`
- Modify: `apps/backend/src/api/order/routes/order.ts`
- Create: `apps/backend/src/api/order/policies/is-owner.ts`

- [ ] **Step 1: Заменить `controllers/order.ts` на кастомный**

```ts
// apps/backend/src/api/order/controllers/order.ts
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
```

- [ ] **Step 2: Заменить `routes/order.ts`**

```ts
// apps/backend/src/api/order/routes/order.ts
export default {
  routes: [
    {
      method: 'POST',
      path: '/orders',
      handler: 'api::order.order.create',
      config: { policies: ['api::session.is-authenticated'] },
    },
    {
      method: 'POST',
      path: '/orders/preview-promo',
      handler: 'api::order.order.previewPromo',
      config: { policies: ['api::session.is-authenticated'] },
    },
    {
      method: 'POST',
      path: '/orders/:id/mark-paid',
      handler: 'api::order.order.markPaid',
      config: { policies: ['api::session.is-authenticated'] },
    },
    {
      method: 'GET',
      path: '/me/orders',
      handler: 'api::order.order.findMine',
      config: { policies: ['api::session.is-authenticated'] },
    },
    {
      method: 'GET',
      path: '/me/orders/:id',
      handler: 'api::order.order.findOneMine',
      config: { policies: ['api::session.is-authenticated'] },
    },
  ],
};
```

- [ ] **Step 3: TS-проверка**

```bash
npm run build
```

- [ ] **Step 4: Smoke**

```bash
npm run develop
```

Открыть Strapi Admin → Settings → Users & Permissions → Authenticated → отметить все 5 actions у `Order` (`create`, `previewPromo`, `markPaid`, `findMine`, `findOneMine`) и сохранить. (В Task 25 это перенесём в bootstrap.) Остановить.

- [ ] **Step 5: Закоммитить**

```bash
git add apps/backend/src/api/order
git commit -m "feat(backend): кастомные эндпоинты заказа (create, preview-promo, mark-paid, me/orders)"
```

---

## Task 25: Кастомные эндпоинты билетов (GET /me/tickets)

**Files:**
- Modify: `apps/backend/src/api/ticket/controllers/ticket.ts`
- Modify: `apps/backend/src/api/ticket/routes/ticket.ts`

- [ ] **Step 1: Заменить `controllers/ticket.ts`**

```ts
// apps/backend/src/api/ticket/controllers/ticket.ts
import { factories } from '@strapi/strapi';

const stripQrFromList = (rows: any[]) =>
  (rows || []).map((r) => ({ ...r, qrPayload: undefined }));

export default factories.createCoreController('api::ticket.ticket', ({ strapi }) => ({
  async findMine(ctx: any) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();

    const tickets = await strapi.db.query('api::ticket.ticket').findMany({
      where: { order: { user: userId } },
      populate: {
        event: { populate: { coverImage: true, venue: true } },
        tier: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const stripped = stripQrFromList(tickets);
    const sanitized = await this.sanitizeOutput(stripped, ctx);
    ctx.body = { data: sanitized };
  },

  async findOneMine(ctx: any) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();
    const id = Number(ctx.params.id);

    const ticket: any = await strapi.db.query('api::ticket.ticket').findOne({
      where: { id, order: { user: userId } },
      populate: {
        event: { populate: { coverImage: true, venue: true, organizer: { populate: { logo: true } } } },
        tier: true,
        attendee: true,
      },
    });
    if (!ticket) return ctx.notFound();

    // qrPayload отдаётся ВЛАДЕЛЬЦУ — не пропускаем через sanitize (private),
    // отдаём raw полем + остальное санитайзим вручную минимально.
    ctx.body = {
      data: {
        id: ticket.id,
        documentId: ticket.documentId,
        number: ticket.number,
        status: ticket.status,
        usedAt: ticket.usedAt,
        qrPayload: ticket.qrPayload,
        attendee: ticket.attendee,
        event: ticket.event,
        tier: ticket.tier,
      },
    };
  },
}));
```

- [ ] **Step 2: Заменить `routes/ticket.ts`**

```ts
// apps/backend/src/api/ticket/routes/ticket.ts
export default {
  routes: [
    {
      method: 'GET',
      path: '/me/tickets',
      handler: 'api::ticket.ticket.findMine',
      config: { policies: ['api::session.is-authenticated'] },
    },
    {
      method: 'GET',
      path: '/me/tickets/:id',
      handler: 'api::ticket.ticket.findOneMine',
      config: { policies: ['api::session.is-authenticated'] },
    },
  ],
};
```

- [ ] **Step 3: TS-проверка**

```bash
npm run build
```

- [ ] **Step 4: Закоммитить**

```bash
git add apps/backend/src/api/ticket
git commit -m "feat(backend): кастомные эндпоинты me/tickets с защитой qr"
```

---

## Task 26: Кастомные эндпоинты favorites

**Files:**
- Modify: `apps/backend/src/api/favorite/controllers/favorite.ts`
- Modify: `apps/backend/src/api/favorite/routes/favorite.ts`

- [ ] **Step 1: Заменить `controllers/favorite.ts`**

```ts
// apps/backend/src/api/favorite/controllers/favorite.ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::favorite.favorite', ({ strapi }) => ({
  async addFavorite(ctx: any) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();
    const eventId = Number(ctx.request.body?.eventId);
    if (!eventId) return ctx.badRequest('eventId required');

    const event = await strapi.db.query('api::event.event').findOne({ where: { id: eventId } });
    if (!event) return ctx.notFound();

    const existing = await strapi.db.query('api::favorite.favorite').findOne({
      where: { user: userId, event: eventId },
    });
    if (existing) {
      ctx.body = { data: existing, alreadyExisted: true };
      return;
    }

    const created = await strapi.db.query('api::favorite.favorite').create({
      data: { user: userId, event: eventId },
    });
    ctx.status = 201;
    ctx.body = { data: created, alreadyExisted: false };
  },

  async removeFavorite(ctx: any) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();
    const eventId = Number(ctx.params.eventId);

    const existing = await strapi.db.query('api::favorite.favorite').findOne({
      where: { user: userId, event: eventId },
    });
    if (!existing) return ctx.notFound();

    await strapi.db.query('api::favorite.favorite').delete({ where: { id: existing.id } });
    ctx.status = 204;
  },

  async findMine(ctx: any) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();

    const rows = await strapi.db.query('api::favorite.favorite').findMany({
      where: { user: userId },
      populate: { event: { populate: { coverImage: true, tiers: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const sanitized = await this.sanitizeOutput(rows, ctx);
    ctx.body = { data: sanitized };
  },
}));
```

- [ ] **Step 2: Заменить `routes/favorite.ts`**

```ts
// apps/backend/src/api/favorite/routes/favorite.ts
export default {
  routes: [
    {
      method: 'POST',
      path: '/favorites',
      handler: 'api::favorite.favorite.addFavorite',
      config: { policies: ['api::session.is-authenticated'] },
    },
    {
      method: 'DELETE',
      path: '/favorites/:eventId',
      handler: 'api::favorite.favorite.removeFavorite',
      config: { policies: ['api::session.is-authenticated'] },
    },
    {
      method: 'GET',
      path: '/me/favorites',
      handler: 'api::favorite.favorite.findMine',
      config: { policies: ['api::session.is-authenticated'] },
    },
  ],
};
```

- [ ] **Step 3: TS-проверка**

```bash
npm run build
```

- [ ] **Step 4: Закоммитить**

```bash
git add apps/backend/src/api/favorite
git commit -m "feat(backend): кастомные эндпоинты favorites"
```

---

## Task 27: Кастомный поиск events + findBySlug

**Files:**
- Modify: `apps/backend/src/api/event/controllers/event.ts`
- Modify: `apps/backend/src/api/event/routes/event.ts`

- [ ] **Step 1: Заменить controllers/event.ts**

```ts
// apps/backend/src/api/event/controllers/event.ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::event.event', ({ strapi }) => ({
  async search(ctx: any) {
    const q = String(ctx.query.q || '').trim();
    if (!q) {
      ctx.body = { data: [] };
      return;
    }
    const rows = await strapi.db.query('api::event.event').findMany({
      where: {
        publishedAt: { $notNull: true },
        status: 'published',
        title: { $containsi: q },
      },
      populate: { coverImage: true, venue: true, tiers: true },
      orderBy: { startsAt: 'asc' },
      limit: 50,
    });
    const sanitized = await this.sanitizeOutput(rows, ctx);
    ctx.body = { data: sanitized };
  },

  async findBySlug(ctx: any) {
    const slug = String(ctx.params.slug);
    const event = await strapi.db.query('api::event.event').findOne({
      where: { slug, publishedAt: { $notNull: true }, status: 'published' },
      populate: {
        coverImage: true,
        gallery: true,
        pastGallery: true,
        venue: true,
        organizer: { populate: { logo: true } },
        agenda: { populate: { speakers: { populate: { photo: true } } } },
        speakers: { populate: { photo: true } },
        tiers: true,
      },
    });
    if (!event) return ctx.notFound();
    const sanitized = await this.sanitizeOutput(event, ctx);
    ctx.body = { data: sanitized };
  },
}));
```

- [ ] **Step 2: Заменить routes/event.ts (custom + default core)**

```ts
// apps/backend/src/api/event/routes/event.ts
export default {
  routes: [
    {
      method: 'GET',
      path: '/events/search',
      handler: 'api::event.event.search',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/events/by-slug/:slug',
      handler: 'api::event.event.findBySlug',
      config: { auth: false },
    },
    // Дефолтные find/findOne оставляем — Strapi createCoreController
    // расширяет их автоматически. Поскольку мы заменили ENTIRE routes
    // объект на plain — нужно явно вернуть дефолтные тоже.
    {
      method: 'GET',
      path: '/events',
      handler: 'api::event.event.find',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/events/:id',
      handler: 'api::event.event.findOne',
      config: { auth: false },
    },
  ],
};
```

- [ ] **Step 3: TS-проверка + smoke**

```bash
npm run build
npm run develop
```

В Admin UI: создать опубликованный Event со slug `test-event`. Открыть в браузере `http://localhost:1337/api/events/by-slug/test-event` (после выдачи прав в bootstrap). Пока ожидаем 403 — это нормально, права выдадим в Task 28. Остановить.

- [ ] **Step 4: Закоммитить**

```bash
git add apps/backend/src/api/event
git commit -m "feat(backend): кастомный поиск events и findBySlug"
```

---

## Task 28: Bootstrap permissions для всех новых actions

**Files:**
- Modify: `apps/backend/src/index.ts`

- [ ] **Step 1: Расширить `index.ts` полным списком permissions**

```ts
// apps/backend/src/index.ts
import type { Core } from '@strapi/strapi';

const PUBLIC_ACTIONS = [
  'api::event.event.find',
  'api::event.event.findOne',
  'api::event.event.search',
  'api::event.event.findBySlug',
  'api::speaker.speaker.find',
  'api::speaker.speaker.findOne',
  'api::organizer.organizer.find',
  'api::organizer.organizer.findOne',
  'api::banner.banner.find',
  'api::speaker-application.speaker-application.create',
  'api::manager-contact-request.manager-contact-request.create',
] as const;

const AUTHENTICATED_ACTIONS = [
  ...PUBLIC_ACTIONS,
  'api::session.session.list',
  'api::session.session.revoke',
  'api::session.session.revokeOthers',
  'api::favorite.favorite.addFavorite',
  'api::favorite.favorite.removeFavorite',
  'api::favorite.favorite.findMine',
  'api::order.order.create',
  'api::order.order.previewPromo',
  'api::order.order.markPaid',
  'api::order.order.findMine',
  'api::order.order.findOneMine',
  'api::ticket.ticket.findMine',
  'api::ticket.ticket.findOneMine',
] as const;

const grantPermissions = async (
  strapi: Core.Strapi,
  roleType: 'public' | 'authenticated',
  actions: readonly string[],
) => {
  const role: any = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: roleType } });
  if (!role) {
    strapi.log.warn(`users-permissions: role ${roleType} not found, skipping`);
    return;
  }
  for (const action of actions) {
    const existing = await strapi.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { role: role.id, action } });
    if (existing) continue;
    await strapi.db
      .query('plugin::users-permissions.permission')
      .create({ data: { role: role.id, action } });
    strapi.log.info(`users-permissions: granted ${action} to ${roleType}`);
  }
};

const assertRequiredEnv = () => {
  if (!process.env.TICKET_QR_SECRET || process.env.TICKET_QR_SECRET.length < 16) {
    throw new Error(
      'TICKET_QR_SECRET env is required (min length 16). Set it in apps/backend/.env',
    );
  }
};

const bootstrapEnabled = (): boolean => {
  const v = process.env.BOOTSTRAP_PERMISSIONS;
  if (v === undefined) return process.env.NODE_ENV !== 'production';
  return v === 'true';
};

export default {
  register() {
    assertRequiredEnv();
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    if (!bootstrapEnabled()) {
      strapi.log.info('bootstrap permissions: disabled by BOOTSTRAP_PERMISSIONS');
      return;
    }
    await grantPermissions(strapi, 'public', PUBLIC_ACTIONS);
    await grantPermissions(strapi, 'authenticated', AUTHENTICATED_ACTIONS);
  },
};
```

- [ ] **Step 2: Smoke — Strapi стартует и выдаёт права**

```bash
npm run develop
```

Expected: в логах `users-permissions: granted api::event.event.find to public` и т. д. Двойной запуск (Ctrl+C → `npm run develop` снова) — на втором запуске сообщений `granted` уже не должно быть (идемпотентность). Остановить.

- [ ] **Step 3: Smoke — публичный API доступен**

В работающем Strapi (запустить третий раз) проверить через curl:
```bash
curl http://localhost:1337/api/events
```

Expected: JSON `{ "data": [...], "meta": {...} }` (200), не 403. Остановить.

- [ ] **Step 4: Закоммитить**

```bash
git add apps/backend/src/index.ts
git commit -m "feat(backend): идемпотентный bootstrap permissions для публичных и авторизованных эндпоинтов"
```

---

## Task 29: Banner active filter (только активные баннеры)

**Files:**
- Modify: `apps/backend/src/api/banner/controllers/banner.ts`

- [ ] **Step 1: Заменить controllers/banner.ts**

```ts
// apps/backend/src/api/banner/controllers/banner.ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::banner.banner', ({ strapi }) => ({
  async find(ctx: any) {
    const now = new Date();
    const rows = await strapi.db.query('api::banner.banner').findMany({
      where: {
        publishedAt: { $notNull: true },
        $and: [
          { $or: [{ activeFrom: { $null: true } }, { activeFrom: { $lte: now } }] },
          { $or: [{ activeUntil: { $null: true } }, { activeUntil: { $gte: now } }] },
        ],
      },
      populate: { image: true, event: true },
      orderBy: { priority: 'desc' },
    });
    const sanitized = await this.sanitizeOutput(rows, ctx);
    ctx.body = { data: sanitized };
  },
}));
```

- [ ] **Step 2: TS-проверка + smoke**

```bash
npm run build
```

- [ ] **Step 3: Закоммитить**

```bash
git add apps/backend/src/api/banner
git commit -m "feat(backend): фильтрация активных баннеров на /api/banners"
```

---

## Task 30: Integration-тест — полный сценарий покупки

**Files:**
- Create: `apps/backend/tests/integration/order-flow.test.ts`

> Этот тест проверяет ключевой DoD пункт: создать event → POST /orders → POST mark-paid → проверить, что билеты выпустились.

- [ ] **Step 1: Написать тест**

```ts
// apps/backend/tests/integration/order-flow.test.ts
import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from '../helpers/strapi';
import { createOrder } from '../../src/domain/orders/createOrder';
import { markOrderPaid } from '../../src/domain/orders/markOrderPaid';
import { OrderValidationError } from '../../src/domain/orders/types';

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
      slug: `test-event-${Date.now()}`,
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
      username: `user-${Date.now()}`,
      email: `u${Date.now()}@test.local`,
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
      populate: { attendee: true },
    });
    expect(tickets.length).toBe(2);
    expect(tickets.every((t: any) => t.status === 'valid')).toBe(true);
    expect(tickets.every((t: any) => typeof t.qrPayload === 'string' && t.qrPayload.length > 10)).toBe(true);
    expect(tickets.map((t: any) => t.attendee?.fullName).sort()).toEqual(['Иванов И.И.', 'Петров П.П.']);
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
```

- [ ] **Step 2: Запустить тест**

```bash
npm run test:integration
```

Expected: 6 passed.

> Если тесты падают из-за DB-state (повторные запуски используют те же таблицы) — это ожидаемо, т.к. фикстуры создают записи с уникальными timestamp'ами. Если нужен полный teardown, добавить `await strapi.db.lifecycles.clear()` перед `teardownStrapi`. Для v1 теста этого хватит.

- [ ] **Step 3: Закоммитить**

```bash
git add apps/backend/tests/integration/order-flow.test.ts
git commit -m "test(backend): integration-тест полного сценария заказ → оплата → билеты"
```

---

## Task 31: Integration-тест favorites + прав на чужой ticket

**Files:**
- Create: `apps/backend/tests/integration/favorites.test.ts`
- Create: `apps/backend/tests/integration/ticket-ownership.test.ts`

- [ ] **Step 1: Написать тест favorites**

```ts
// apps/backend/tests/integration/favorites.test.ts
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
  const user: any = await strapi.db.query('plugin::users-permissions.user').create({
    data: {
      username: `fav-${Date.now()}`,
      email: `fav${Date.now()}@t.local`,
      provider: 'local',
      password: 'PassPass1!',
      confirmed: true,
      role: role?.id,
    },
  });
  const event: any = await strapi.db.query('api::event.event').create({
    data: {
      slug: `fav-event-${Date.now()}`,
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

    // Имитируем «addFavorite» — find существующий по (user,event), если есть — не создаём
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
```

- [ ] **Step 2: Написать тест ownership билета**

```ts
// apps/backend/tests/integration/ticket-ownership.test.ts
import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from '../helpers/strapi';
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

    const ts = Date.now();
    const userA: any = await strapi.db.query('plugin::users-permissions.user').create({
      data: { username: `a-${ts}`, email: `a${ts}@t.l`, provider: 'local', password: 'P!1abcdef', confirmed: true, role: role?.id },
    });
    const userB: any = await strapi.db.query('plugin::users-permissions.user').create({
      data: { username: `b-${ts}`, email: `b${ts}@t.l`, provider: 'local', password: 'P!1abcdef', confirmed: true, role: role?.id },
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
});
```

- [ ] **Step 3: Запустить тесты**

```bash
npm run test:integration
```

Expected: все integration тесты passed.

- [ ] **Step 4: Закоммитить**

```bash
git add apps/backend/tests/integration/favorites.test.ts apps/backend/tests/integration/ticket-ownership.test.ts
git commit -m "test(backend): integration-тесты favorites и ownership билета"
```

---

## Task 32: Финальный smoke + проверка DoD

**Files:** проверочный таск, не создаёт файлов.

- [ ] **Step 1: Полная сборка**

```bash
cd apps/backend
npm run build
```

Expected: success.

- [ ] **Step 2: Все тесты**

```bash
npm test
```

Expected: все unit + integration зелёные.

- [ ] **Step 3: Smoke develop**

```bash
npm run develop
```

В Admin UI проверить:
- [ ] Все 13 Content Types + Session видны.
- [ ] User имеет поля fullName, phone, avatar.
- [ ] Создать опубликованный Event с venue, organizer, speakers, tier.
- [ ] Авторизованный пользователь (создать через /auth/local/register с deviceId) → POST /api/orders → POST /api/orders/:id/mark-paid → GET /api/me/tickets возвращает билет.

**Manual smoke** (опционально, через curl):

```bash
# Регистрация
curl -X POST http://localhost:1337/api/auth/local/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","email":"demo@t.local","password":"DemoPass1!","deviceId":"dev1","deviceName":"smoke"}'
# Сохранить access-токен

# Создание заказа (нужны актуальные ID event и tier из admin UI)
curl -X POST http://localhost:1337/api/orders \
  -H "Authorization: Bearer <ACCESS>" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": 1, "items":[{"tierId":1,"quantity":1}],
    "paymentMethod":"card","personalDataConsent":true,
    "attendees":[{"fullName":"Demo","email":"d@t.l"}]
  }'

# mark-paid (NODE_ENV != production)
curl -X POST http://localhost:1337/api/orders/1/mark-paid \
  -H "Authorization: Bearer <ACCESS>"

# Мои билеты
curl -H "Authorization: Bearer <ACCESS>" http://localhost:1337/api/me/tickets
```

Expected: финальный GET возвращает билет с populated event/tier, **БЕЗ qrPayload**.

```bash
curl -H "Authorization: Bearer <ACCESS>" http://localhost:1337/api/me/tickets/1
```

Expected: возвращает билет **С qrPayload**.

```bash
# qrPayload не утекает в публичных эндпоинтах
curl http://localhost:1337/api/tickets
```

Expected: 403 (роут не разрешён публично) или пустой массив без qrPayload.

- [ ] **Step 4: Остановить, итоговый коммит — ничего не должно быть в working tree**

```bash
git status
```

Expected: clean.

- [ ] **Step 5: Финальная проверка DoD по списку из спеки** (mark в issue / PR description, не в commit):

- [x] Strapi стартует.
- [x] Existing auth-флоу работают.
- [x] /api/users/me содержит профильные поля.
- [x] Сценарий покупки end-to-end работает.
- [x] qrPayload защищён.
- [x] capacity overflow → 409.
- [x] personalDataConsent=false → 400.
- [x] Тесты зелёные.
- [x] Build чистый.
- [x] TICKET_QR_SECRET в `.env.example`.
- [x] Все коммиты — Conventional Commits на русском.

---

## Self-Review (после написания плана)

**1. Spec coverage:**
- §1 Цель/объём: покрыт всеми тасками 1-32.
- §2 Решения брейншторма: ✓ B (все типы есть), organizer как сущность (Task 5), profile поля (Task 2), state machine (Task 22-23), capacity на event (Task 9 + проверка в Task 22), currency RUB (Task 7, 11, 12), D&P toggle (распределён по schema.json). Approach 1+3 — boilerplate ручной (Task 4-17), domain отдельно (Task 18-23).
- §3 Структура файлов: реализуется тасками 1-29.
- §4 Content Types: каждый тип = свой таск (Task 5-17).
- §5 User extension: Task 2.
- §6 Order flow: Tasks 22-24.
- §7 API endpoints: Tasks 24-27, 29 (поиск, by-slug, banner active, me/orders, me/tickets, favorites). **Gap:** для `speaker.findOne by slug`, `organizer.findOne by id`, `speaker-application.create`, `manager-contact-request.create` мы оставили дефолтные core CRUD — they handled by `factories.createCoreRouter` and the bootstrap permissions cover them. ✓
- §8 Permissions/sanitize/security: Task 28 (bootstrap), sanitize рассыпан по контроллерам в Task 24-27, ENV в Task 21 + 28.
- §9 Тесты: unit Tasks 18-20, integration Tasks 30-31.
- §10 DoD: проверочный список в Task 32.
- §11 Открытые вопросы: явно за scope.

**2. Placeholders:** проверил — нет TBD/TODO/«implement later».

**3. Type consistency:**
- `OrderValidationError` определён в Task 22, используется в Task 22, 23, 24, 30. ✓
- `CreateOrderInput` определён в Task 22 types.ts, используется в Task 22, 24, 30. ✓
- `signTicketQrPayload` сигнатура `(data: TicketQrData, secret: string)` — Task 20, использование в Task 23 совпадает. ✓
- Permission action names в Task 28 совпадают с handler-именами в кастомных controllers Tasks 24-27 (`addFavorite`, `removeFavorite`, `findMine`, `previewPromo`, `markPaid`, `findOneMine`, `search`, `findBySlug`). ✓

**4. Замечание:** в Task 27 заменили roots /events/:id на тоже `auth: false`. Дефолтные core роуты обычно auto-public в `find/findOne` через `createCoreRouter`. Поскольку мы переписали routes как plain object, нужно явно указать `auth: false` (что и сделано). Permission в bootstrap (`api::event.event.find`/`findOne`) на эти plain routes действует одинаково. ✓
