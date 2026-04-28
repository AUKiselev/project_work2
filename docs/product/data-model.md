# Модель данных (черновик v0)

> Предложение Content Types для Strapi 5 на основе экранов из
> `screens.md`. Принимается архитектором проекта при первой реализации модуля
> `events`. До утверждения — эталон для обсуждения, не для слепого копирования.

## ER-обзор

```
User ──┬── owns ──> Order ── contains ──> OrderItem ── of ──> TicketTier ── belongs ──> Event
       │                                                       │
       │                                                       └── has many Ticket
       │                                                                     │
       └── attends ──────────────────────────────────────────────────────────┘
                                                                             │
User ── favorites m:n ──> Event                                              │
                                                                             │
Event ── m:n ──> Speaker                                                     │
Event ── 1:1 ──> Venue (адрес/координаты/карта)                              │
Event ── 1:n ──> AgendaItem (программа)                                      │
Event ── 1:n ──> EventMedia (фото мероприятия / прошлого мероприятия)        │
Order ── has 1:n Ticket с заполненной анкетой Attendee ──────────────────────┘
PromoCode ── m:n ──> Event (или глобальный)
Banner ── для рекламного слайдера на главной
```

## Content Types (Strapi 5)

Поля даны в `camelCase` (Strapi-конвенция). Связи описаны для ориентира,
точные `relation`-типы (`oneToMany` / `manyToOne` / `manyToMany`) уточняются в
schema.json.

> **Локализация:** на v1 контент только на русском. Strapi-флаг `i18n` для
> текстовых полей **не включаем**. Если в будущем потребуется uz/en — это
> отдельная задача (миграция полей через i18n-плагин).

### `event`
- `slug` (uid) — для URL.
- `title` (string).
- `shortDescription` (string).
- `description` (richtext).
- `coverImage` (media single).
- `gallery` (media multiple) — фото мероприятия.
- `pastGallery` (media multiple) — фото с прошлого мероприятия.
- `startsAt` / `endsAt` (datetime, UTC).
- `timezone` (string, IANA).
- `venue` (relation → `venue`).
- `organizer` (relation → `organizer` или `user`).
- `speakers` (m:n → `speaker`).
- `agenda` (1:n → `agendaItem`).
- `tiers` (1:n → `ticketTier`).
- `priceMin` / `priceMax` (computed, integer; либо считаем на лету для UI).
- `status` (enum: `draft` / `published` / `cancelled` / `archived`).
- `publishedAt` (Strapi default).

### `ticketTier`
- `event` (manyToOne → `event`).
- `name` (string) — «VIP», «Standard»…
- `description` (text).
- `includes` (richtext) — содержимое аккордеона «что входит».
- `price` (integer, минимальные единицы валюты).
- `currency` (enum: `RUB`; на v1 только рубли — расширим при необходимости).
- `capacity` (integer, optional) — лимит билетов.
- `sortOrder` (integer).

### `order`
- `user` (manyToOne → `user`).
- `number` (string, unique) — человекочитаемый номер.
- `items` (1:n → `orderItem`).
- `tickets` (1:n → `ticket`) — после успешной оплаты.
- `subtotal` / `discount` / `total` (integer).
- `currency` (enum).
- `promoCode` (manyToOne → `promoCode`, optional).
- `paymentMethod` (enum: `card` / `sbp` / `invoice`).
- `paymentStatus` (enum: `pending` / `paid` / `failed` / `refunded`).
- `paymentProviderId` (string) — id у внешнего шлюза.
- `personalDataConsentAt` (datetime, обязателен для completed).
- `createdAt` / `updatedAt`.

### `orderItem`
- `order` (manyToOne → `order`).
- `tier` (manyToOne → `ticketTier`).
- `quantity` (integer).
- `unitPrice` (integer) — снапшот цены на момент покупки.

### `ticket`
- `order` (manyToOne → `order`).
- `tier` (manyToOne → `ticketTier`).
- `event` (manyToOne → `event`) — денормализация для удобных выборок.
- `number` (string, unique).
- `qrPayload` (string, secret) — что зашифровано в QR.
- `attendee` (component, см. ниже).
- `status` (enum: `valid` / `used` / `refunded` / `cancelled`).
- `usedAt` (datetime, optional).

### Component `attendee` (анкета посетителя)
Reusable component (не Content Type). Поля стартовые, расширяемые
организатором мероприятия:
- `fullName` (string, required).
- `email` (email).
- `phone` (string).
- `extra` (json) — произвольные доп.-поля анкеты.

### `speaker`
- `slug` (uid).
- `fullName` (string).
- `photo` (media).
- `bio` (richtext).
- `events` (m:n обратная связь → `event`).
- `social` (json: `{ telegram, linkedin, x, ... }`).

### `organizer`
- `name` (string).
- `logo` (media).
- `description` (richtext).
- `events` (1:n → `event`).
- (Альтернатива — расширить `user` ролью `organizer`. Решить при реализации.)

### `venue`
- `name` (string).
- `address` (string).
- `lat` / `lng` (decimal) — для карты.
- `mapEmbed` (string, optional).

### `agendaItem`
- `event` (manyToOne → `event`).
- `startsAt` / `endsAt` (datetime).
- `title` (string).
- `description` (text).
- `speakers` (m:n → `speaker`).

### `favorite` (wishlist)
- `user` (manyToOne → `user`).
- `event` (manyToOne → `event`).
- Уникальный индекс `(user, event)`.

### `promoCode`
- `code` (string, unique, uppercase).
- `discountType` (enum: `percent` / `fixed`).
- `discountValue` (integer).
- `validFrom` / `validUntil` (datetime).
- `maxUses` / `usedCount` (integer).
- `events` (m:n → `event`, optional; пусто = глобальный).

### `banner` (рекламный слайдер на главной)
- `title` (string).
- `image` (media).
- `event` (manyToOne → `event`, optional).
- `url` (string, optional).
- `priority` (integer).
- `activeFrom` / `activeUntil` (datetime).

### `speakerApplication` («Стать спикером»)
- `user` (manyToOne → `user`, optional).
- `fullName` (string).
- `email` (email).
- `topic` (string).
- `description` (text).
- `status` (enum: `new` / `reviewing` / `accepted` / `rejected`).

### `managerContactRequest` («Связаться с менеджером»)
- `user` (manyToOne → `user`, optional).
- `subject` (string).
- `message` (text).
- `contactBack` (string).
- `status` (enum: `new` / `processing` / `done`).

### Уже реализовано (не трогать без причины)
- `session` (Device Session) — `apps/backend/src/api/session/`.

## Эндпоинты (черновой контракт)

Стандартные Strapi REST-роуты + кастомные:

- `GET /api/events?sort=startsAt:asc&filters[startsAt][$gte]=now&pagination[page]=1`
  — лента главной.
- `GET /api/events/search?q=...` — экран поиска.
- `GET /api/events/:slug` — детальная страница.
- `POST /api/favorites` / `DELETE /api/favorites/:id` — «мне интересно».
- `POST /api/orders` — создать заказ (валидация количеств, расчёт цены, промокод).
- `POST /api/orders/:id/pay` — инициировать оплату по выбранному способу.
- `POST /api/payments/webhook` — колбэк от платёжного шлюза.
- `GET /api/me/tickets` — купленные билеты (текущий пользователь).
- `GET /api/me/tickets/:id` — детальный билет с QR.
- `GET /api/me/favorites` — избранное.
- `POST /api/speaker-applications` — заявка «Стать спикером».
- `POST /api/manager-contact-requests` — «Связаться с менеджером».

## Решения, требующие подтверждения

См. секцию «Открытые вопросы» в `screens.md` — без них модель закрывать
нельзя (платёжный провайдер влияет на поля `order`; multi-language контента
влияет на схемы и т. д.).
