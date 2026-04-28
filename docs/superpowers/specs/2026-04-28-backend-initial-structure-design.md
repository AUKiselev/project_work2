# Backend: первоначальная структура (Strapi 5)

> Дата: 2026-04-28. Статус: design (утверждён к плану реализации).
> Источники: `docs/product/data-model.md`, `docs/product/screens.md`,
> `docs/product/glossary.md`, корневой `CLAUDE.md`.

## 1. Цель и объём

Создать первоначальную структуру backend-части (Strapi 5): добавить все
доменные Content Types из `data-model.md`, расширить пользовательскую
модель полями профиля, реализовать сценарий заказа/выпуска билетов с
заглушённой оплатой. Существующая auth-часть (`session` + расширение
`users-permissions`) **остаётся как есть**.

### Что входит в v1
- Все Content Types из `data-model.md` (вариант B при брейншторме):
  каталог (`event`, `ticket-tier`, `speaker`, `organizer`, `venue`,
  `agenda-item`, `banner`), транзакции (`order`, `order-item`, `ticket`),
  промо/избранное (`favorite`, `promo-code`), формы заявок
  (`speaker-application`, `manager-contact-request`).
- Reusable component `attendee` (анкета посетителя).
- Расширение `plugin::users-permissions.user` полями `fullName`, `avatar`,
  `phone`.
- Бизнес-сервис создания заказа (`createOrder`) и выпуска билетов
  (`markOrderPaid`) с полноценной state machine `paymentStatus`.
- Dev-only ручка `POST /api/orders/:id/mark-paid` для эмуляции webhook
  платёжного шлюза.
- Кастомные `me/...` эндпоинты для билетов/заказов/избранного.
- Bootstrap-настройка permissions для ролей `Public` / `Authenticated`.
- Unit + integration тесты на критичные сценарии.

### Что НЕ входит в v1
- Реальная интеграция платёжного шлюза (ЮKassa/Stripe/СБП). На месте
  webhook'а — dev-ручка под `NODE_ENV !== 'production'`.
- Multi-language контент (i18n плагин). v1 — RU only.
- Кастомные роли поверх `Public`/`Authenticated`. Управление каталогом —
  только Strapi Admin UI.
- E2E тесты с фронтом, нагрузочные тесты, rate-limiting.
- Per-tier capacity (лимит на категорию). Лимит — только на event.
- Возврат билетов через публичный API (только Admin UI на v1).
- Push-уведомления.

## 2. Архитектурные решения (зафиксированы при брейншторме)

| # | Решение |
|---|---|
| 1 | Полный объём схем (вариант B), но без бизнес-логики платежей. |
| 2 | `organizer` — отдельный Content Type, **не** роль User. |
| 3 | Профиль пользователя — расширение `users-permissions.user` (поля `fullName`, `avatar`, `phone`). Отдельный `Profile` не вводим. |
| 4 | Order state machine `pending → paid → failed/refunded`. Билеты выпускаются ТОЛЬКО при переходе в `paid`. Dev-ручка `mark-paid` замещается webhook'ом без изменения бизнес-логики. |
| 5a | `capacity` — на уровне `event`, не на `ticket-tier`. |
| 5b | Поле `currency` (enum, default `RUB`) присутствует на `order`, `order-item.unitPrice`, `ticket-tier.price`. На v1 фактически только RUB. |
| 5c | Draft & Publish: ON для `event`, `speaker`, `organizer`, `banner`. OFF для остальных. |
| Подход | Schema через `npx strapi generate api` + ручное заполнение `schema.json`; бизнес-логика — в отдельном модуле `src/domain/`. Контроллеры тонкие. |

## 3. Структура файлов

```
apps/backend/src/
├── api/
│   ├── session/                       # уже есть, не трогаем
│   ├── event/                         # content-types/event/schema.json + controllers/routes/services
│   ├── ticket-tier/
│   ├── speaker/
│   ├── organizer/
│   ├── venue/
│   ├── agenda-item/
│   ├── order/                         # custom: POST /, POST /:id/mark-paid, POST /preview-promo
│   ├── order-item/
│   ├── ticket/                        # custom: GET /me/tickets, GET /me/tickets/:id
│   ├── favorite/                      # custom: POST /, DELETE /:eventId, GET /me/favorites
│   ├── promo-code/
│   ├── banner/
│   ├── speaker-application/
│   └── manager-contact-request/
├── components/
│   └── attendee/
│       └── attendee.json              # reusable component
├── domain/                            # бизнес-сервисы (Подход 3)
│   └── orders/
│       ├── createOrder.ts
│       ├── markOrderPaid.ts
│       ├── pricing.ts
│       ├── numbering.ts
│       └── qrPayload.ts
├── extensions/
│   └── users-permissions/
│       ├── strapi-server.ts           # уже есть
│       └── content-types/user/schema.json   # +fullName, +avatar, +phone
├── middlewares/
│   └── csrf-cookie-origin.ts          # уже есть
├── bootstrap/
│   └── permissions.ts                 # идемпотентная настройка ролей
└── index.ts                           # подключает bootstrap/permissions
```

**Принцип Подхода 3:** controller order'а парсит вход, вызывает
функцию из `domain/orders/`, маппит результат в response. Никакой
бизнес-логики в controller. Domain-слой тестируется изолированно.

## 4. Content Types и связи

Имена Content Types — `kebab-case`. Поля — `camelCase`. Цены — целые
числа в минимальных единицах валюты (копейки).

### 4.1. Каталог (контент)

#### `event` — Draft & Publish: ON
- `slug` (uid, target=`title`).
- `title` (string, required).
- `shortDescription` (string).
- `description` (richtext).
- `coverImage` (media single).
- `gallery` (media multiple).
- `pastGallery` (media multiple).
- `startsAt` (datetime, required).
- `endsAt` (datetime).
- `timezone` (string, default `Europe/Moscow`).
- `capacity` (integer, nullable). Если задан — общее число выпущенных
  билетов на event не превышает его.
- `status` (enum: `draft` / `published` / `cancelled` / `archived`,
  default `draft`).
- Relations: `venue` (manyToOne), `organizer` (manyToOne),
  `speakers` (manyToMany inverse), `agenda` (oneToMany → `agenda-item`),
  `tiers` (oneToMany → `ticket-tier`).

#### `ticket-tier` — D&P: OFF
- `name` (string, required) — «Standard», «VIP»…
- `description` (text).
- `includes` (richtext) — содержимое аккордеона.
- `price` (integer, required, минимальные единицы валюты).
- `currency` (enum `RUB`, default `RUB`, required).
- `sortOrder` (integer, default 0).
- Relations: `event` (manyToOne, required).

#### `speaker` — D&P: ON
- `slug` (uid).
- `fullName` (string, required).
- `photo` (media single).
- `bio` (richtext).
- `social` (json).
- Relations: `events` (manyToMany inverse → `event.speakers`).

#### `organizer` — D&P: ON
- `name` (string, required).
- `logo` (media single).
- `description` (richtext).
- Relations: `events` (oneToMany inverse → `event.organizer`).

#### `venue` — D&P: OFF
- `name` (string, required).
- `address` (string).
- `lat` (decimal).
- `lng` (decimal).
- `mapEmbed` (string).

#### `agenda-item` — D&P: OFF
- `startsAt` (datetime, required).
- `endsAt` (datetime).
- `title` (string, required).
- `description` (text).
- Relations: `event` (manyToOne, required), `speakers` (manyToMany).

### 4.2. Транзакции

#### `order` — D&P: OFF
- `number` (string, required, unique) — формат `EVT-YYYYMMDD-XXXXXX`.
- `subtotal` (integer, required).
- `discount` (integer, default 0).
- `total` (integer, required).
- `currency` (enum `RUB`, required).
- `paymentMethod` (enum `card`/`sbp`/`invoice`, required).
- `paymentStatus` (enum `pending`/`paid`/`failed`/`refunded`, default
  `pending`, required).
- `paymentProviderId` (string, nullable, **private**).
- `personalDataConsentAt` (datetime, required при создании).
- `draftAttendees` (json, **private**) — анкеты посетителей до выпуска
  билетов.
- Relations: `user` (manyToOne → `users-permissions.user`, required),
  `items` (oneToMany → `order-item`), `tickets` (oneToMany → `ticket`),
  `promoCode` (manyToOne → `promo-code`, optional).

#### `order-item` — D&P: OFF
- `quantity` (integer, required, ≥ 1).
- `unitPrice` (integer, required) — снапшот цены на момент создания.
- Relations: `order` (manyToOne, required), `tier` (manyToOne →
  `ticket-tier`, required).

#### `ticket` — D&P: OFF
- `number` (string, required, unique) — `T-YYYYMMDD-XXXXXX`.
- `qrPayload` (string, required, **private**) — подписанный токен.
- `status` (enum `valid`/`used`/`refunded`/`cancelled`, default `valid`).
- `usedAt` (datetime, nullable).
- `attendee` (component `attendee`, required).
- Relations: `order` (manyToOne, required), `tier` (manyToOne, required),
  `event` (manyToOne, required) — денормализация.

#### Component `attendee` (reusable)
- `fullName` (string, required).
- `email` (email).
- `phone` (string).
- `extra` (json) — расширяемые поля анкеты.

> Поля `email`, `phone`, `extra` — содержат ПД. Sanitize-слой удаляет их
> из всех публичных ответов; видны только владельцу через
> `GET /api/me/tickets/:id`.

### 4.3. Промо / контент-маркетинг

#### `favorite` — D&P: OFF
- Relations: `user` (manyToOne, required), `event` (manyToOne,
  required).
- Уникальность пары `(user, event)` — service-level (Strapi не
  поддерживает композитные unique без миграции).

#### `promo-code` — D&P: OFF
- `code` (string, required, unique, uppercase normalize).
- `discountType` (enum `percent`/`fixed`, required).
- `discountValue` (integer, required).
- `validFrom` (datetime).
- `validUntil` (datetime).
- `maxUses` (integer, nullable; null = безлимит).
- `usedCount` (integer, default 0, **private**).
- Relations: `events` (manyToMany → `event`, optional; пусто =
  глобальный).

#### `banner` — D&P: ON
- `title` (string, required).
- `image` (media single, required).
- `url` (string).
- `priority` (integer, default 0).
- `activeFrom` (datetime).
- `activeUntil` (datetime).
- Relations: `event` (manyToOne, optional).

### 4.4. Заявки / обращения

#### `speaker-application` — D&P: OFF
- `fullName` (string, required).
- `email` (email, required).
- `topic` (string).
- `description` (text).
- `status` (enum `new`/`reviewing`/`accepted`/`rejected`, default `new`).
- Relations: `user` (manyToOne, optional).

#### `manager-contact-request` — D&P: OFF
- `subject` (string, required).
- `message` (text, required).
- `contactBack` (string).
- `status` (enum `new`/`processing`/`done`, default `new`).
- Relations: `user` (manyToOne, optional).

## 5. Расширение пользователя

В `src/extensions/users-permissions/content-types/user/schema.json`
добавить поля поверх стоковых:
- `fullName` (string, maxLength 200, optional).
- `phone` (string, maxLength 32, optional).
- `avatar` (media single, optional).

Обратные связи (rev-relations) — через `mappedBy` в схемах:
- `orders` ← `order.user`.
- `favorites` ← `favorite.user`.
- `sessions` (уже есть) ← `session.user`.
- `speakerApplications` ← `speaker-application.user`.
- `managerContactRequests` ← `manager-contact-request.user`.

**Sanitize:**
- В кастомных эндпоинтах, отдающих relation `user` (например, через
  populate из order'а), разворачиваем только `{ id, fullName, avatar }`.
  Никогда не отдаём `email`, `phone` чужого пользователя.
- Стандартный `/api/users` отключён для `Public`.

**Регистрация** уже работает через расширенный `auth.callback` /
`auth.register` в `strapi-server.ts`. Новые поля optional — поток не
ломается.

**Роли** — только встроенные `Public` / `Authenticated`.

## 6. Order flow

### 6.1. State machine `paymentStatus`

```
pending ──[mark-paid / webhook]──▶ paid ──[refund admin]──▶ refunded
   │                                  │
   └────[fail / timeout]──▶ failed    └─ tickets.status = valid
```

Запрещённые переходы валидируются в сервисах
`markOrderPaid` / `markOrderFailed` / `refundOrder` (последний — на v1
ручной admin-переход без публичного API).

### 6.2. `POST /api/orders` (Authenticated)

Body:
```json
{
  "eventId": 123,
  "items": [{ "tierId": 5, "quantity": 2 }],
  "promoCode": "SUMMER10",
  "paymentMethod": "card",
  "personalDataConsent": true,
  "attendees": [
    { "fullName": "Иванов И.И.", "email": "...", "phone": "...", "extra": {} }
  ]
}
```

Сервис `createOrder` (в `domain/orders/createOrder.ts`),
обёрнут в `strapi.db.transaction`:

1. Загрузить event с `tiers`. Проверить `event.status === 'published'`,
   `startsAt > now`.
2. Все `items[].tierId` принадлежат этому event.
3. `sum(items[].quantity) === attendees.length` — иначе 400.
4. **Capacity-check:** `existing valid tickets for event +
   sum(items.quantity) <= event.capacity` (если capacity не null).
5. `personalDataConsent === true`, иначе 400.
6. Применить `promoCode`: валидно по `validFrom`/`validUntil`,
   `usedCount < maxUses` (если maxUses), scope включает event (или
   глобальный). Пересчитать `subtotal/discount/total`.
7. `orderItem.unitPrice = tier.price` снапшотом.
8. Сгенерировать `order.number` (см. `numbering.ts`).
9. Создать `order` со `paymentStatus=pending`,
   `personalDataConsentAt=now()`,
   `draftAttendees=attendees`, и связанные `orderItem`-ы.
10. Билеты НЕ выпускаются на этом шаге.
11. Вернуть DTO заказа.

### 6.3. `POST /api/orders/:id/mark-paid` (dev-only, Authenticated)

Контроллер:
```ts
if (process.env.NODE_ENV === 'production') return ctx.notFound();
```

Только владелец заказа. Сервис `markOrderPaid` (в транзакции):

1. Загрузить order, проверить `paymentStatus === 'pending'` (иначе 409).
2. Установить `paymentStatus=paid`, `paymentProviderId='dev:mark-paid'`.
3. **issueTickets:** для каждого `orderItem` × `quantity` создать
   `ticket`:
   - `number` (unique, `T-YYYYMMDD-XXXXXX`).
   - `qrPayload` — HMAC-подписанный токен `{ ticketId, eventId, number,
     iat }`. Секрет — `TICKET_QR_SECRET`. ENV проверяется при старте
     Strapi (`register()` lifecycle), отсутствие — fail-fast.
   - `attendee` — компонент из `order.draftAttendees[i]` по порядку
     (`items` распакованы в плоский список).
   - `status='valid'`, `event` денормализуется из `tier.event`.
4. Очистить `order.draftAttendees`.
5. Если был промокод — `promo.usedCount++`.
6. Вернуть order с populated tickets.

Когда добавим реальный шлюз — этот же сервис вызывается из
`POST /api/payments/webhook` после верификации подписи провайдера.

### 6.4. `POST /api/orders/preview-promo` (Authenticated)

Body — как у `createOrder`, без `attendees` и `personalDataConsent`.
Возвращает `subtotal`, `discount`, `total`, `applied: bool`,
`reason: string|null`. Заказ не создаётся.

## 7. API endpoints

### Public (read-only)
- `GET /api/events` — лента; populate: `coverImage`, `organizer.logo`,
  `tiers`.
- `GET /api/events/:slug` — детальная (по slug). Populate:
  `coverImage`, `gallery`, `pastGallery`, `venue`, `organizer.logo`,
  `agenda.speakers.photo`, `speakers.photo`, `tiers`.
- `GET /api/events/search?q=...` — `$containsi` по `title`.
- `GET /api/speakers/:slug`.
- `GET /api/organizers/:id`.
- `GET /api/banners` — активные (`activeFrom <= now <= activeUntil`),
  сорт. по `priority desc`.
- `POST /api/speaker-applications`.
- `POST /api/manager-contact-requests`.

### Authenticated
- `POST /api/favorites` — body `{ eventId }`. Дубль возвращает 200.
- `DELETE /api/favorites/:eventId`.
- `GET /api/me/favorites`.
- `POST /api/orders`.
- `POST /api/orders/preview-promo`.
- `POST /api/orders/:id/mark-paid` (dev-only).
- `GET /api/me/orders`.
- `GET /api/me/orders/:id`.
- `GET /api/me/tickets`.
- `GET /api/me/tickets/:id` — `qrPayload` отдаётся ТОЛЬКО владельцу.

### Не выставлены наружу (только Admin UI / populate)
- `ticket-tier`, `agenda-item`, `venue` — только через populate из
  `event`.
- `order-item` — только через populate из `order`.
- `promo-code` — только проверка через `preview-promo` / `createOrder`.
- `event` create/update/delete — Admin UI.
- Чтение `speaker-application` / `manager-contact-request` — Admin UI.

## 8. Permissions / sanitize / безопасность

### 8.1. Bootstrap permissions

`src/bootstrap/permissions.ts` — идемпотентная функция, вызывается из
`src/index.ts → bootstrap()`. Для каждой пары `(role, action)` из
конфига делает `findOrCreate`. Запускается, только если ENV
`BOOTSTRAP_PERMISSIONS=true` (default `true` в dev, `false` в prod —
чтобы не перетирать ручные правки).

Конфиг — массив:
```ts
{
  Public: [
    'api::event.event.find',
    'api::event.event.findOne',
    'api::event.event.search',
    'api::speaker.speaker.findOne',
    'api::organizer.organizer.findOne',
    'api::banner.banner.find',
    'api::speaker-application.speaker-application.create',
    'api::manager-contact-request.manager-contact-request.create',
  ],
  Authenticated: [
    /* ...всё из Public плюс ... */
    'api::favorite.favorite.create',
    'api::favorite.favorite.deleteByEvent',
    'api::favorite.favorite.findMine',
    'api::order.order.create',
    'api::order.order.previewPromo',
    'api::order.order.markPaid',
    'api::order.order.findMine',
    'api::order.order.findOneMine',
    'api::ticket.ticket.findMine',
    'api::ticket.ticket.findOneMine',
  ],
}
```

### 8.2. Sanitize в кастомных контроллерах

В Strapi 5 sanitize в кастомных контроллерах **не работает
автоматически**. Используем
`strapi.contentAPI.sanitize.output(entity, contentType, { auth:
ctx.state.auth })` перед каждым response.

### 8.3. Поля `private: true` в schema.json
- `ticket.qrPayload`.
- `order.paymentProviderId`.
- `order.draftAttendees`.
- `promo-code.usedCount`.
- На компонент `attendee` поля `email`/`phone`/`extra` — фильтруем в
  кастомных контроллерах, не через `private` (он на компоненты не
  всегда корректно действует), либо явно selecting в populate.

### 8.4. Ownership-проверки

Для всех `me/...` эндпоинтов:
- На уровне query всегда `filters[user][id][$eq] = ctx.state.user.id`.
- Helper `assertOwnership(ctx, entity, ownerPath)` кидает **404** (не
  403) — чтобы не подтверждать существование чужих ресурсов.

### 8.5. Policies

Используем существующую `global::is-authenticated`
(`src/api/session/policies/is-authenticated.ts`) — она уже доказана
работающей.

### 8.6. Логирование

Никогда не логируем: `qrPayload`, `attendee.*`, `draftAttendees`,
refresh/access токены, `paymentProviderId`. Это правило уже в
`CLAUDE.md`.

### 8.7. Новые ENV-переменные
- `TICKET_QR_SECRET` — required, fail-fast в `register()` lifecycle.
- `BOOTSTRAP_PERMISSIONS` — `true`/`false`, default `true` в dev,
  `false` в prod.

Добавляются в `apps/backend/.env.example`.

### 8.8. Что не делаем в v1
- Rate limiting на публичные формы и `POST /api/orders`. Отдельная
  задача с Redis-bucket'ом.
- Кастомный brute-force для login — у `users-permissions` есть
  встроенный.

## 9. Тесты

### 9.1. Unit (Jest) — `domain/orders/`
- `pricing.ts` — percent/fixed promo, edge cases (100% скидка, без
  промо, expired).
- `numbering.ts` — формат, уникальность при коллизии (retry).
- `qrPayload.ts` — генерация, верификация, отказ при подделке.
- Чистые функции; мокаем `crypto`/`Date`.

### 9.2. Integration (Jest + Strapi test instance)
- `createOrder` happy path.
- `createOrder` errors: `event.status != published`, прошлое
  `startsAt`, `attendees.length != sum(quantity)`, capacity overflow,
  invalid promo, `personalDataConsent=false`.
- `markOrderPaid` happy path: `pending → paid`, выпускает N билетов с
  правильным attendee, очищает `draftAttendees`.
- `markOrderPaid` errors: 404 на чужой заказ, 409 если уже `paid`.
- `markOrderPaid` 404 в `NODE_ENV='production'`.
- `favorites`: дубль не создаёт второй row, DELETE по eventId.
- `me/tickets/:id`: 404 на чужой билет; `qrPayload` отдаётся только
  владельцу.

### 9.3. Smoke
- Strapi стартует, schema валидна, `bootstrap permissions` отрабатывает
  идемпотентно (двойной запуск не падает).

## 10. Definition of Done

- [ ] `npm run dev` стартует без ошибок; все Content Types видны в
      Admin UI.
- [ ] Существующие auth-флоу (login/refresh/logout/sessions)
      продолжают работать (smoke).
- [ ] Регистрация → `/api/users/me` возвращает `fullName`, `avatar`,
      `phone` (null если не заполнены).
- [ ] `POST /api/events` через Admin UI создаёт event со связанными
      tier'ами; `GET /api/events` возвращает его публично.
- [ ] Сценарий покупки: создать event → `POST /api/orders` →
      `POST /api/orders/:id/mark-paid` → `GET /api/me/tickets`
      возвращает билеты с корректными attendee.
- [ ] `qrPayload` не утекает в `find`-эндпоинте; виден только в
      `findOneMine`.
- [ ] Capacity overflow → 409.
- [ ] `personalDataConsent=false` → 400.
- [ ] Все unit + integration тесты зелёные.
- [ ] `strapi build` без ошибок типов.
- [ ] `TICKET_QR_SECRET` в `.env.example`; в коде нет хардкоженных
      секретов.
- [ ] Conventional commit на русском (например,
      `feat(backend): добавить content types каталога и заказов`).

## 11. Открытые вопросы (отслеживать вне v1)

Эти решения пока заморожены, влияют на следующие итерации:
- Платёжный шлюз (ЮKassa / Stripe / СБП) — повлияет на webhook и поля
  `order.payment*`.
- Возврат билетов через публичный API — политика возвратов от
  заказчика.
- Per-tier лимиты внутри event'а (если потребуется sub-allocation).
- Push-уведомления (напоминания, статусы заказа).
- Multi-language контента (uz/en) — отдельная миграция через i18n.
