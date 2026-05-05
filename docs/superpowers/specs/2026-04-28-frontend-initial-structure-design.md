# Frontend: первоначальная структура (Nuxt 4)

> Дата: 2026-04-28. Статус: design (утверждён к плану реализации).
> Источники: `docs/product/screens.md`, `docs/product/data-model.md`,
> `docs/product/glossary.md`, корневой `CLAUDE.md`,
> `docs/superpowers/specs/2026-04-28-backend-initial-structure-design.md`.

## 1. Цель и объём

Реализовать пользовательскую часть платформы билетов (Nuxt 4 + Capacitor)
против уже готового бэкенда (Strapi 5). Цель — рабочий e2e-сценарий
покупки в браузере (PWA), все 8 экранов из `screens.md` + ЛК, RU only,
mobile-first, dark-only.

Существующая auth-обвязка (`stores/auth.ts`, `plugins/api.ts`,
`plugins/auth.client.ts`, middleware `auth/guest`, страницы
`login/register/sessions`) **остаётся как есть** — расширяется только UI
и тип `User`.

### Что входит в v1
- Главная — `BannerSlider` + лента `EventCard` (`startsAt asc`).
- Поиск событий по названию (`useEvents().search`).
- Детальная страница события — все блоки из `screens.md` (hero,
  организатор, дата/место, описание, программа, карта, спикеры,
  прошлые фото, цена-from-to, кнопка «Купить»).
- Выбор билетов (степпер по `tier`, аккордеон «что входит»,
  промокод через `POST /orders/preview-promo`).
- Checkout (анкеты на каждый билет, способ оплаты, согласие на ПД,
  `POST /orders`).
- Mock-pay (dev only) — страница `/orders/[id]/pay` с кнопкой
  «Симулировать оплату» (`POST /orders/:id/mark-paid`). На production
  страница 404.
- Список купленных билетов и детальный билет с QR.
- ЛК: профиль, избранное, sessions, форма «связаться с менеджером»,
  форма «стать спикером», logout.
- «Мне интересно» (favorites) на карточках и детали.
- Авторизованный гость — публичные экраны без логина; при попытке
  защищённого действия (favorites, купить, /tickets, /account) —
  редирект на `/login?redirect=…` через middleware.

### Что НЕ входит в v1
- Native-сборка (iOS/Android) и связанные обвязки (`@capacitor/share`,
  push, deep-link, разрешения). PWA-only в этом спеке.
- Реальный платёжный шлюз (СБП/карты/счёт) — заменяет dev-ручка
  `mark-paid`.
- Email-подтверждение регистрации (если в `users-permissions` включат —
  UI добавим точечно отдельной задачей).
- Возврат билетов из UI (только Admin UI).
- Multi-language UI (i18n не подключаем — RU only).
- Карта как SDK (Yandex/Leaflet) — только `mapEmbed` iframe или
  deep-link на Я.Карты.
- PDF-генератор билета — на v1 «Скачать» сохраняет QR как PNG через
  `canvas.toDataURL`.
- Редактирование профиля (`fullName`/`phone`/`avatar`) пользователем —
  на v1 только server-side / Admin UI.
- E2E в CI — Playwright-смоук пишем, но в pipeline подключим позже.

## 2. Архитектурные решения (зафиксированы при брейншторме)

| # | Решение | Обоснование |
|---|---------|-------------|
| 1 | **Nuxt 4 file-based routing**, без FSD. Domain-группировка в `app/components/<domain>/`. | Зафиксировано в memory `frontend_no_fsd`. |
| 2 | **Nuxt UI v4** (`@nuxt/ui`) как UI-кит. Тема dark-only через `app.config.ts`. | Подтверждено в брейншторме. |
| 3 | **Tailwind v4** через `@tailwindcss/vite` (уже стоит). Кастомные дизайн-токены — `@theme` директива в `app/assets/css/app.css`. | Уже в проекте. |
| 4 | **Pinia stores** только для cross-page состояния: `auth` (есть), `cart`, `favorites`. Прочее — composables с `useAsyncData`. | YAGNI: read-only данные в store не пишем. |
| 5 | **Data fetching**: `useAsyncData` + `$api` для GET (SSR-friendly), `$api` напрямую для мутаций. | Идиоматично для Nuxt 4. |
| 6 | **Типы DTO** руками в `app/types/api.ts` под Strapi 5 REST. Хелпер `unwrapStrapi` в `app/utils/api.ts`. Без `openapi-typescript` в v1. | Объём типов небольшой, кодген усложняет dev-цикл. |
| 7 | **Тексты RU** напрямую в шаблонах. Числа/даты — `Intl.*` через утилиты `app/utils/format.ts`. | RU-only зафиксировано. |
| 8 | **Mobile-first**: bottom-nav на `<lg`, top-nav на `≥lg`. `env(safe-area-inset-bottom)` для iOS notch. | Источник UX мобильный, web/PWA ходят и с десктопа. |
| 9 | **Auth остаётся как есть** — расширяем только тип `User` и UI. | Работает, не трогаем. |
| 10 | **Cart** — Pinia + `sessionStorage` через `useStorage` (VueUse). TTL 1 час. Сбрасывается на успешный `createOrder` и на logout. | Черновик не критичен после закрытия вкладки. |
| 11 | **Промокод** — валидируется через `POST /orders/preview-promo` по клику «Применить». Результат живёт в cart-store до отправки. | Бэк уже предоставляет precheck. |
| 12 | **Mock-pay** — страница `/orders/[id]/pay` под флагом `NUXT_PUBLIC_APP_ENV !== 'production'` (иначе 404). Соответствует бэк-гарду. | Симметрично бэку. |
| 13 | **Карта** — `EventMap.vue`: если есть `venue.mapEmbed` — sandboxed iframe; иначе deep-link `https://yandex.ru/maps/?text=<address>`. Никаких SDK. | 0 deps, 0 ключей. |
| 14 | **QR** — библиотека `qrcode` (~7 КБ), рендер в `<canvas>` из `qrPayload`. | Без тяжёлых SDK. |
| 15 | **Share** — `useShare()` композбл: `navigator.share()` → fallback `useClipboard()` + toast. | Нативно работает в браузерах. |
| 16 | **Toaster** — `useToast()` из Nuxt UI. Глобальный обработчик API-ошибок (не для validation 400) в `plugins/api.ts`. | Стандартный путь. |
| 17 | **Тесты** — Vitest для composables/utils + Playwright smoke (1 e2e) для главного сценария покупки. | Достаточно для DoD. |
| 18 | **Richtext** (`event.description`, `tier.includes`, правила использования) санитайзим через `dompurify` перед `v-html`. | XSS-защита. |
| 19 | **Формы** — `UForm` + `zod`-схемы. | Стандарт Nuxt UI v4. |
| 20 | **Иконки** — `@nuxt/icon` (приходит с UI). Heroicons-outline + phosphor для bottom-nav active. | Без растровых иконок. |

## 3. Структура файлов

```
apps/frontend/
├── app/
│   ├── app.vue                        # уже есть
│   ├── app.config.ts                  # NEW: Nuxt UI theme (primary, gray)
│   ├── error.vue                      # NEW: 404 / 500
│   ├── assets/
│   │   └── css/
│   │       └── app.css                # есть; +@theme tokens, +Nuxt UI imports
│   ├── components/
│   │   ├── common/                    # AppBackButton, AppShareButton, AppEmpty,
│   │   │                              # AppErrorState, EventMap, AppMarkdown
│   │   ├── layout/                    # AppTopNav, AppBottomNav
│   │   ├── banner/                    # BannerSlider, BannerSlide
│   │   ├── event/                     # EventCard, EventCardCompact,
│   │   │                              # EventCardMyTicket, EventDateBadge,
│   │   │                              # EventPriceRange, EventOrganizerBlock,
│   │   │                              # EventAgenda, EventSpeakers,
│   │   │                              # EventGallery, EventHero, EventCardSkeleton
│   │   ├── speaker/                   # SpeakerCard, SpeakerCardCompact
│   │   ├── ticket-tier/               # TierAccordion, TierStepper, CartSummary
│   │   ├── order/                     # AttendeeForm, PaymentMethodPicker,
│   │   │                              # PromoCodeInput, PersonalDataConsent,
│   │   │                              # OrderSummary
│   │   ├── ticket/                    # TicketQr, TicketDetails, TicketAttendeeList
│   │   ├── favorite/                  # FavoriteToggle
│   │   └── account/                   # AccountMenu, ProfileCard
│   ├── composables/
│   │   ├── useDeviceId.ts             # уже есть
│   │   ├── useSessions.ts             # есть; перевод на $api
│   │   ├── useEvents.ts               # NEW
│   │   ├── useBanners.ts              # NEW
│   │   ├── useFavorites.ts            # NEW (тонкая обёртка над favoritesStore)
│   │   ├── useCart.ts                 # NEW (тонкая обёртка над cartStore)
│   │   ├── useOrder.ts                # NEW
│   │   ├── useTickets.ts              # NEW
│   │   ├── useSpeakerApplication.ts   # NEW
│   │   ├── useManagerContact.ts       # NEW
│   │   └── useShare.ts                # NEW
│   ├── layouts/
│   │   ├── default.vue                # переписать: top-nav + main + bottom-nav
│   │   ├── auth.vue                   # NEW: чистый layout (login/register)
│   │   └── back.vue                   # NEW: layout с back-кнопкой (детальные)
│   ├── middleware/
│   │   ├── auth.ts                    # есть
│   │   └── guest.ts                   # есть
│   ├── pages/
│   │   ├── index.vue                  # переписать: главная (banner + feed)
│   │   ├── search.vue                 # NEW
│   │   ├── login.vue                  # есть; переверстать на UForm
│   │   ├── register.vue               # есть; переверстать на UForm + поле fullName (опц.)
│   │   ├── events/
│   │   │   └── [slug]/
│   │   │       ├── index.vue          # NEW: детали
│   │   │       ├── checkout/
│   │   │       │   ├── index.vue      # NEW: выбор билетов
│   │   │       │   └── pay.vue        # NEW: анкеты + способ оплаты
│   │   │       └── speaker/
│   │   │           └── [slug].vue     # NEW: профиль спикера (опц., см. §10)
│   │   ├── orders/
│   │   │   └── [id]/
│   │   │       └── pay.vue            # NEW: mock-pay
│   │   ├── tickets/
│   │   │   ├── index.vue              # NEW: список купленных
│   │   │   └── [id].vue               # NEW: билет с QR
│   │   ├── account/
│   │   │   ├── index.vue              # NEW: меню ЛК
│   │   │   ├── favorites.vue          # NEW
│   │   │   ├── become-speaker.vue     # NEW
│   │   │   ├── contact-manager.vue    # NEW
│   │   │   └── sessions.vue           # перенос из /sessions
│   │   └── sessions.vue               # есть; превращается в редирект на /account/sessions
│   ├── plugins/
│   │   ├── api.ts                     # есть; +глобальный onResponseError → toast
│   │   └── auth.client.ts             # есть
│   ├── stores/
│   │   ├── auth.ts                    # есть; +reset hooks для cart/favorites
│   │   ├── cart.ts                    # NEW
│   │   └── favorites.ts               # NEW
│   ├── types/
│   │   └── api.ts                     # NEW: DTOs
│   └── utils/
│       ├── platform.ts                # есть
│       ├── storage.ts                 # есть
│       ├── format.ts                  # NEW: formatPrice, formatDate, formatDateRange
│       ├── api.ts                     # NEW: unwrapStrapi, parseStrapiError
│       └── sanitize.ts                # NEW: sanitizeHtml (DOMPurify wrapper)
├── tests/
│   ├── unit/
│   │   ├── format.spec.ts
│   │   ├── cart.spec.ts
│   │   ├── unwrapStrapi.spec.ts
│   │   └── parseStrapiError.spec.ts
│   └── e2e/
│       ├── fixtures/
│       │   └── seed.ts                # idempotent seed event/tier/banner
│       └── purchase-flow.spec.ts
├── nuxt.config.ts                     # +@nuxt/ui module, +runtimeConfig.public.appEnv
├── package.json                       # см. §11
├── vitest.config.ts                   # NEW
└── playwright.config.ts               # NEW
```

## 4. Карта роутов

| Path | Layout | Middleware | Содержимое |
|------|--------|------------|-----------|
| `/` | default | — | Главная: BannerSlider + EventCard-лента |
| `/search?q=` | default | — | Поиск (debounce 300ms, мин. 2 символа) |
| `/events/[slug]` | back | — | Детали события (Экран 3 из screens.md) |
| `/events/[slug]/checkout` | back | auth | Выбор билетов (Экран 4) |
| `/events/[slug]/checkout/pay` | back | auth | Анкеты + оплата (Экран 5) |
| `/events/[slug]/speaker/[slug]` | back | — | Профиль спикера (если бэк отдаёт нужные populate) |
| `/orders/[id]/pay` | back | auth | Mock-pay (dev only); 404 в production |
| `/tickets` | default | auth | Список купленных (Экран 6) |
| `/tickets/[id]` | back | auth | Билет с QR (Экран 7) |
| `/account` | default | auth | Меню ЛК (Экран 8) |
| `/account/favorites` | back | auth | Избранное |
| `/account/become-speaker` | back | auth | Форма заявки спикера |
| `/account/contact-manager` | back | auth | Форма связи с менеджером |
| `/account/sessions` | back | auth | Активные сессии (перенос) |
| `/sessions` | default | auth | Stub-редирект на `/account/sessions` |
| `/login`, `/register` | auth | guest | Уже есть, рефреш UI |
| `*` (404) | default | — | `error.vue` |

## 5. Типы и хелперы API

`app/types/api.ts` — DTO под Strapi 5 REST. Бэк отдаёт `{ data, meta }`,
`data` плоский (без legacy `attributes`-обёртки).

```ts
export interface StrapiCollection<T> {
  data: T[];
  meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } };
}
export interface StrapiSingle<T> { data: T }

export interface MediaFile {
  id: number;
  url: string;
  width?: number; height?: number; mime?: string;
  formats?: { thumbnail?: { url: string }; small?: { url: string }; medium?: { url: string } };
}

export interface Event {
  id: number; documentId: string;
  slug: string; title: string;
  shortDescription?: string; description?: string;
  coverImage?: MediaFile; gallery?: MediaFile[]; pastGallery?: MediaFile[];
  startsAt: string; endsAt?: string; timezone: string;
  capacity?: number;
  status: 'draft' | 'published' | 'cancelled' | 'archived';
  venue?: Venue; organizer?: Organizer;
  speakers?: Speaker[]; agenda?: AgendaItem[]; tiers?: TicketTier[];
}

export interface TicketTier {
  id: number; documentId: string;
  name: string; description?: string; includes?: string;
  price: number; currency: 'RUB'; sortOrder: number;
  event?: Pick<Event, 'id' | 'slug' | 'title'>;
}

export interface Venue { id: number; name: string; address?: string; lat?: number; lng?: number; mapEmbed?: string }
export interface Organizer { id: number; name: string; logo?: MediaFile; description?: string }
export interface Speaker { id: number; documentId: string; slug: string; fullName: string; photo?: MediaFile; bio?: string; social?: Record<string, string> }
export interface AgendaItem { id: number; startsAt: string; endsAt?: string; title: string; description?: string; speakers?: Speaker[] }
export interface Banner { id: number; title: string; image: MediaFile; url?: string; priority: number; activeFrom?: string; activeUntil?: string }

export interface Attendee { fullName: string; email?: string; phone?: string; extra?: Record<string, unknown> }

export interface OrderItem {
  id: number;
  quantity: number; unitPrice: number;
  tier?: TicketTier;
}

export interface Order {
  id: number; documentId: string;
  number: string;
  subtotal: number; discount: number; total: number; currency: 'RUB';
  paymentMethod: 'card' | 'sbp' | 'invoice';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  personalDataConsentAt: string;
  items?: OrderItem[]; tickets?: Ticket[];
  promoCode?: { code: string };
}

export interface Ticket {
  id: number; documentId: string;
  number: string; qrPayload?: string;
  status: 'valid' | 'used' | 'refunded' | 'cancelled';
  attendee: Attendee;
  order?: Pick<Order, 'id' | 'number'>;
  tier?: Pick<TicketTier, 'id' | 'name' | 'price' | 'currency'>;
  event?: Pick<Event, 'id' | 'slug' | 'title' | 'startsAt' | 'venue'>;
}

export interface Favorite { id: number; event: Pick<Event, 'id' | 'slug'> }

export interface PreviewPromoResponse {
  subtotal: number; discount: number; total: number;
  applied: boolean; reason: 'expired' | 'limit' | 'not-eligible' | 'invalid' | null;
}

export interface CreateOrderPayload {
  eventId: number;
  items: { tierId: number; quantity: number }[];
  promoCode?: string;
  paymentMethod: 'card' | 'sbp' | 'invoice';
  personalDataConsent: true;
  attendees: Attendee[];
}
```

`app/utils/api.ts`:
- `unwrapStrapi<T>(res: StrapiSingle<T> | StrapiCollection<T>)` →
  одиночный объект или массив. Если `data === null` для single —
  кидает 404-подобную ошибку.
- `parseStrapiError(err)` → `{ status, code, message, fields?: Record<string,string> }`.
  Парсит формат `{ error: { status, name, message, details: { errors?: [{path, message}] } } }`.

## 6. Composables

Каждый — тонкая обёртка над `$api` (5–15 строк). Не пишут в Pinia,
кроме `useCart`/`useFavorites`, которые проксируют в одноимённые сторы.

| Composable | Методы | API endpoint |
|---|---|---|
| `useEvents()` | `list({ page, pageSize, sort })`, `findBySlug(slug)`, `search(q)` | `GET /events`, `GET /events/:slug`, `GET /events/search?q=` |
| `useBanners()` | `list()` | `GET /banners` |
| `useFavorites()` | `add(eventId)`, `remove(eventId)`, `listMine()`, `isFavorite(eventId)` | `POST /favorites`, `DELETE /favorites/:eventId`, `GET /me/favorites` |
| `useCart()` | `add(tier, qty)`, `setQty(tierId, qty)`, `remove(tierId)`, `setPromo(code)`, `applyPromo()`, `reset()`, getters `items / subtotal / discount / total / itemsCount / isEmpty` | через `cartStore`; `applyPromo` → `POST /orders/preview-promo` |
| `useOrder()` | `previewPromo(payload)`, `create(payload)`, `markPaid(id)`, `listMine()`, `findOneMine(id)` | `POST /orders/preview-promo`, `POST /orders`, `POST /orders/:id/mark-paid`, `GET /me/orders`, `GET /me/orders/:id` |
| `useTickets()` | `listMine()`, `findOneMine(id)` | `GET /me/tickets`, `GET /me/tickets/:id` |
| `useSpeakerApplication()` | `submit(payload)` | `POST /speaker-applications` |
| `useManagerContact()` | `submit(payload)` | `POST /manager-contact-requests` |
| `useShare()` | `share({ title, text, url })` → `navigator.share` → clipboard fallback + toast | — |
| `useSessions()` | `list()`, `revoke(id)` | `GET /auth/sessions`, `DELETE /auth/sessions/:id` (перевод существующего на `$api`) |

## 7. Pinia stores

### `stores/cart.ts`
```ts
state: {
  eventSlug: string | null;
  items: Array<{
    tierId: number;
    qty: number;
    snapshot: { name: string; price: number; currency: 'RUB' };
  }>;
  promoCode: string | null;
  promoApplied: PreviewPromoResponse | null;
  lastTouched: number; // epoch ms, для TTL
}
getters: { itemsCount, subtotal, discount, total, isEmpty, byTier(id) }
actions: {
  add(tier, qty),                              // обновляет lastTouched
  setQty(tierId, qty),                         // qty=0 → remove
  remove(tierId),
  setPromo(code),                              // только записывает в state
  applyPromo() → Promise<void>,                // вызов previewPromo, пишет promoApplied
  reset(),
  hydrate(),                                   // читает из sessionStorage, чистит если TTL > 1h
  persist(),                                   // пишет в sessionStorage
  ensureEventScope(slug)                       // если eventSlug !== slug, бросает ConfirmRequiredError
}
```
- Persist через `useStorage('pw2.cart', ..., sessionStorage)` от VueUse.
- TTL 1 час: при `hydrate()` если `now - lastTouched > 3_600_000` — `reset()`.
- На успешный `useOrder().create` вызывается `cart.reset()`.
- На `auth.logout()` — `cart.reset()`.

### `stores/favorites.ts`
```ts
state: { ids: Set<number>; loaded: boolean }
getters: { has(eventId) }
actions: {
  ensureLoaded(),     // lazy fetch /me/favorites; идемпотентно
  add(eventId),       // optimistic; на ошибке откат + toast
  remove(eventId),    // optimistic
  reset()             // ids.clear(), loaded=false
}
```
- `auth._clearLocal()` дополняется вызовом `favorites.reset()` и
  `cart.reset()` (через прямой импорт сторов, у которых это no-op,
  если ещё не инициализированы).

## 8. Доменные компоненты

### Layout/навигация
- **`AppTopNav`** (`@media ≥lg`): логотип, ссылки `Главная / Поиск /
  Билеты / ЛК` или `Войти/Регистрация`.
- **`AppBottomNav`** (`@media <lg`): sticky низ, 4 пункта с иконками,
  active = `ui.primary`. Для пунктов «Билеты»/«ЛК» — если не залогинен,
  тап делает `navigateTo('/login?redirect=…')` (без middleware-redirect,
  чтобы избежать flash).
- **`AppBackButton`** — `router.back()` если `history.state.back`,
  иначе `navigateTo('/')`.
- **`AppShareButton`** — иконка-кнопка, обёртка над `useShare()`.

### Карточки событий
- **`EventCard`** — `coverImage` (16:9), дата (бейдж),
  название, краткое описание (clamp 2 строки), `FavoriteToggle`
  (heart) в правом верхнем углу overlay, плашка «от X ₽» внизу.
  Tap → `/events/[slug]`.
- **`EventCardCompact`** — фото 80×80 слева, справа название + дата +
  место. Используется в `/search`.
- **`EventCardMyTicket`** — фото + название + дата + место (без цены и
  сердечка). Используется в `/tickets`.
- **`EventCardSkeleton`** — для `pending`-состояний.

### Детальный экран
- **`EventHero`** — `coverImage`, поверх — `AppBackButton`,
  `FavoriteToggle`, `AppShareButton`.
- **`EventOrganizerBlock`** — лого + название + кнопка «Ещё мероприятия»
  (сейчас → `/search?organizer=<id>`; если бэк не поддерживает фильтр —
  заглушка-toast «скоро»).
- **`EventAgenda`** — список `agenda-item` с временами/спикерами.
- **`EventSpeakers`** — горизонтальный snap-scroll `SpeakerCard`-ов.
- **`EventGallery`** — `pastGallery` snap-scroll.
- **`EventMap`** — `<iframe>` с `mapEmbed`
  (`sandbox="allow-scripts allow-same-origin"`,
  `referrerpolicy="no-referrer"`); fallback — кнопка «Открыть в Я.Картах»
  (deep-link `https://yandex.ru/maps/?text=<encoded address>`).
- **`EventPriceRange`** — высчитывает min/max из `tiers[].price`.

### Cart / checkout
- **`TierAccordion`** — `UAccordion`-обёртка. Заголовок `tier.name` +
  цена справа; тело — `tier.includes` через `<AppMarkdown :html>` +
  `TierStepper`.
- **`TierStepper`** — `−` / `qty` / `+`. Min 0; max client-side —
  суммарное `Σ qty` по всем tier'ам этого event не превышает
  `event.capacity` (если задан). Фронт не знает `issuedTickets` —
  жёсткая капасити-проверка на бэке (409 при переполнении), фронт
  парсит ошибку и показывает toast.
- **`PromoCodeInput`** — input + кнопка «Применить» → `cart.applyPromo()`.
  Состояния: idle / applied (зелёный бейдж: «−X ₽») / error (красная
  подсказка по `reason`).
- **`CartSummary`** — sticky-низ (на mobile), карточка-aside (на
  desktop). Поля `subtotal / discount / total`. Кнопка «Оформить»
  disabled при `cart.isEmpty`.
- **`AttendeeForm`** — `UForm` + zod (`fullName` required,
  `email` valid, `phone` optional, `extra` зарезервировано).
  Префилл первого посетителя из `auth.user`.
- **`PaymentMethodPicker`** — `URadioGroup` с тремя пунктами.
- **`PersonalDataConsent`** — `UCheckbox` + ссылка-плейсхолдер.
- **`OrderSummary`** — финальная сумма + список билетов.

### Билет
- **`TicketQr`** — `<canvas>` через библиотеку `qrcode`. Размер по
  ширине родителя, max 320px. Под канвасом — `number` крупным
  моноширинным шрифтом (для запасного ввода).
- **`TicketDetails`** — название события, дата/время/место, категория +
  цена, номер заказа/билета, заказчик.
- **`TicketAttendeeList`** — раскрывающийся список посетителей при
  `order.tickets.length > 1`. Tap → `UModal` с `TicketQr` для билета.

### Прочее
- **`BannerSlider`** — CSS scroll-snap (без либ). Если scrollable,
  под слайдером — индикатор-точки. Если 1 баннер — без скролла.
- **`FavoriteToggle`** — heart-icon button. На клике без логина →
  `navigateTo('/login?redirect=...')`. На клике залогиненного —
  `optimistic add/remove` через `favoritesStore`.
- **`AppEmpty`**, **`AppErrorState`** — заглушки.
- **`AppMarkdown`** — `<div v-html="sanitizeHtml(html)">` через
  `dompurify` с whitelist (h1–h6, p, ul, ol, li, a[href], strong, em,
  br, img[src,alt]).

## 9. Поток покупки

### Шаг 1. `/events/[slug]/checkout` — выбор билетов
1. `useAsyncData('event-checkout', () => useEvents().findBySlug(slug))`.
2. Если `cart.eventSlug && cart.eventSlug !== slug && !cart.isEmpty` →
   `UModal` «У вас есть выбор билетов на другое мероприятие.
   Очистить и продолжить?». Confirm → `cart.reset()`,
   `cart.eventSlug = slug`. Cancel → `navigateTo('/events/' + cart.eventSlug + '/checkout')`.
3. Список `TierAccordion` для каждого `tier` (отсортировано по
   `sortOrder`). `TierStepper` → `cart.setQty(tier, qty)`. На первом
   `setQty(>0)` для пустой корзины устанавливаем `cart.eventSlug = slug`.
4. `PromoCodeInput` → `cart.setPromo(code)` + кнопка «Применить»
   вызывает `cart.applyPromo()` (внутри — `useOrder().previewPromo({
   eventId, items, promoCode })`).
5. Sticky `CartSummary`. Кнопка «Оформить» → `navigateTo(
   '/events/' + slug + '/checkout/pay')`. Если не залогинен —
   middleware `auth` перебрасывает на `/login?redirect=…`.

### Шаг 2. `/events/[slug]/checkout/pay`
1. Гард: `if (cart.isEmpty || cart.eventSlug !== slug) return navigateTo(
   '/events/' + slug + '/checkout')`.
2. Раскручиваем `cart.items` в плоский список билетов (повторяя по
   `qty`). На каждый билет — `<AttendeeForm>` с заголовком
   «Билет N — {tier.name}». Префилл первого: `fullName ←
   auth.user.fullName ?? ''`, `email ← auth.user.email`, `phone ←
   auth.user.phone ?? ''`.
3. `PaymentMethodPicker` (default `card`). `PersonalDataConsent`.
4. Кнопка «Оплатить» disabled пока не: все `AttendeeForm` валидны
   (zod) + `paymentMethod` + `consent === true`.
5. Submit:
   ```ts
   const order = await useOrder().create({
     eventId, items: cart.items.map(i => ({ tierId: i.tierId, quantity: i.qty })),
     promoCode: cart.promoCode || undefined,
     paymentMethod, personalDataConsent: true,
     attendees,
   });
   cart.reset();
   navigateTo(`/orders/${order.id}/pay`);
   ```
6. Обработка ошибок: 4xx (capacity, invalid promo, expired event) —
   `parseStrapiError` + toast; на 401 — single-flight refresh уже в
   `$api`. Если refresh не прошёл — редирект на `/login?redirect=…`.

### Шаг 3. `/orders/[id]/pay` — Mock-pay
1. `if (config.public.appEnv === 'production') throw createError({ statusCode: 404, fatal: true })`.
2. `const order = await useOrder().findOneMine(id)`. Если 404 — `AppErrorState`.
3. Если `order.paymentStatus === 'paid'` → `navigateTo('/tickets')`.
4. Кнопки:
   - **«Симулировать оплату»** → `await useOrder().markPaid(id)` → toast «Оплачено» → `navigateTo('/tickets')`.
   - **«Отменить»** → `navigateTo('/')`.

### Шаг 4. `/tickets`
1. `useAsyncData('my-tickets', () => useTickets().listMine())`.
2. Группировка: «Будущие» (event.startsAt > now) и «Прошедшие».
3. `EventCardMyTicket` → `/tickets/[id]`.

### Шаг 5. `/tickets/[id]`
1. `useTickets().findOneMine(id)` (бэк sanitize отдаёт `qrPayload`
   только владельцу).
2. Шапка: `AppBackButton`, `AppShareButton`, кнопка «Скачать»
   (`canvas.toDataURL('image/png')` → triggered download через
   `<a download>`).
3. `TicketQr`, `TicketDetails`, `EventMap`, `EventOrganizerBlock`,
   правила использования (richtext через `AppMarkdown` из
   `tier.description` или плейсхолдер).
4. Если `order.tickets.length > 1` — `TicketAttendeeList` со списком
   посетителей; tap по строке → `UModal` с `TicketQr` посетителя.

## 10. ЛК и второстепенные экраны

### `/account/index.vue`
- `ProfileCard`: `avatar` (если есть) или initials, `fullName ?? username`, `email`.
- `AccountMenu`: ссылки на «Избранное» / «Связаться с менеджером» /
  «Стать спикером» / «Активные сессии».
- Кнопка «Выйти» → `auth.logout()` → `navigateTo('/login')`.

### `/account/favorites.vue`
- `useFavorites().listMine()` → лента `EventCard`. `FavoriteToggle`
  отвечает за optimistic remove.

### `/account/become-speaker.vue` и `/account/contact-manager.vue`
- `UForm` + zod. После submit — toast «Заявка отправлена» → `navigateTo(
  '/account')`.
- `become-speaker` поля: `fullName`, `email`, `topic`, `description`.
  Префилл `fullName/email` из `auth.user`.
- `contact-manager` поля: `subject`, `message`, `contactBack` (опц.).

### `/account/sessions.vue`
- Текущий код `pages/sessions.vue` переезжает сюда (с RU-текстами).
  Старый `/sessions` — stub-редирект.

### `/search.vue`
- `URef` для `q`. `useDebounce(q, 300)`. При длине ≥ 2 —
  `useEvents().search(q)`. Иначе — пустой стейт «Введите запрос».
- Карточки `EventCardCompact`. Empty — `AppEmpty` с CTA «На главную».

### `/index.vue` (главная)
- `useAsyncData('home-banners', () => useBanners().list())`
  → `BannerSlider`.
- `useAsyncData('home-feed', () => useEvents().list({ sort: 'startsAt:asc', pageSize: 20 }))`
  → лента `EventCard`.
- Pagination — на v1 не делаем (ленту режем по `pageSize: 20`).
  Подгрузка добавится отдельной задачей.

### `/events/[slug]/speaker/[slug].vue`
- `useEvents().findSpeaker(slug)` или, если бэк не отдаёт отдельный
  endpoint — переходим напрямую через populate из `event.speakers[i]`
  и используем уже загруженного спикера. Если данных не хватает —
  убираем эту страницу из v1 и оставляем только tooltip-карточку.
  Решение принимается в первом таске «event detail».

## 11. Стайлинг и зависимости

### `app/app.config.ts`
```ts
export default defineAppConfig({
  ui: {
    primary: 'indigo',
    gray: 'slate',
    icons: { dynamic: true },
  },
});
```

### `app/assets/css/app.css`
- Импорт Nuxt UI (по доке v4).
- `@theme` с дополнительными токенами:
  ```css
  @theme {
    --radius-card: 1rem;
    --radius-control: 0.5rem;
    --shadow-card: 0 4px 20px rgba(0,0,0,0.3);
    --color-bg: oklch(0.16 0.02 250);
  }
  ```
- Глобально dark: `<Html class="dark">` через `useHead` в
  `app.vue` (без `@nuxtjs/color-mode` — переключатель тем не нужен).

### Mobile / safe-area
- На root `<main>` — `pb-[calc(64px+env(safe-area-inset-bottom))]` на
  мобиле (учёт высоты `BottomNav`).
- `BottomNav`: `fixed bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)]`.

### Шрифт
- Системный стек (`ui-sans-serif, system-ui, ...`). Веб-шрифты не
  подгружаем в v1.

### Контейнер
- `max-w-3xl mx-auto px-4` для desktop. Mobile — full-width с `px-4`.

### Зависимости (`package.json`)

Добавляем:
- `@nuxt/ui` (^4)
- `qrcode` + `@types/qrcode`
- `zod` (^4)
- `dompurify` + `@types/dompurify`
- dev: `vitest`, `@vue/test-utils`, `happy-dom`, `@playwright/test`

Никаких слайдер-либ (`keen-slider`, `swiper`) в v1 — банер делается
через CSS scroll-snap. Если на этапе верстки выяснится, что нужно
поведение по типу «один-в-один с авто-rotate» — добавляем `keen-slider-vue`
точечно одной таской.

### `nuxt.config.ts` — изменения

```ts
modules: [
  '@pinia/nuxt',
  '@vueuse/nuxt',
  '@vite-pwa/nuxt',
  '@nuxt/ui', // NEW
],
runtimeConfig: {
  apiSecret: '',
  public: {
    siteUrl: '',
    apiBase: '',
    refreshCookieName: 'strapi_up_refresh',
    appEnv: 'development', // NEW (NUXT_PUBLIC_APP_ENV)
  },
},
```

Обновить `.env.example` (корень и/или `apps/frontend`) — добавить
`NUXT_PUBLIC_APP_ENV`.

## 12. Ошибки, лоадинг, пустые состояния

- **`<NuxtLoadingIndicator>`** — в `default` и `back` layout-ах.
- **Skeletons**: `EventCardSkeleton` (на главной/поиске),
  `EventDetailSkeleton` (на детальной).
- **Empty**: `AppEmpty { iconName, title, description, ctaLabel, ctaTo }`.
- **Error**: `AppErrorState { iconName, title, description, retry? }`.
  В `error.vue` (root) — 404/500 макеты с кнопкой «На главную».
- **Toast**: глобальный `onResponseError` в `plugins/api.ts` — для
  network-ошибок и 5xx. Validation 4xx — пробрасываем наружу, формы
  сами рисуют поля через `parseStrapiError`. 401 — обрабатывается уже
  существующим single-flight refresh.

## 13. Безопасность фронта

- **Richtext через `dompurify`**: `event.description`, `tier.includes`,
  `tier.description`, `agenda-item.description`. Whitelist в
  `app/utils/sanitize.ts`.
- **iframe карты**: `sandbox="allow-scripts allow-same-origin"`,
  `referrerpolicy="no-referrer"`.
- **`qrPayload` не логируется** (правило из бэка применимо и тут):
  никаких `console.log(ticket)` в коде.
- **Refresh-токен**: на web — HttpOnly cookie (уже работает); на native —
  Keychain через `secureStorage` (уже работает). В Pinia не пишем.
- **CSRF**: бэк делает `Origin`-check на refresh-cookie запросах
  (`csrf-cookie-origin.ts` middleware Strapi). Фронт ничего особого
  не делает — `credentials: 'include'` уже в `$api`.

## 14. Тесты

### Unit (Vitest + happy-dom)
1. `tests/unit/format.spec.ts`:
   - `formatPrice(990000, 'RUB') → '9 900 ₽'`.
   - `formatPrice(0, 'RUB') → 'Бесплатно'` (или `'0 ₽'` — фиксируем в реализации).
   - `formatDate('2026-05-12T10:00:00Z', 'Europe/Moscow') → '12 мая 2026, 13:00'`.
   - `formatDateRange(start, end)` — same day vs. multi-day.
2. `tests/unit/cart.spec.ts`:
   - `add` нового tier, инкремент существующего.
   - `setQty(0)` → удаление.
   - `reset` чистит всё.
   - `applyPromo` через mocked `$api`: success / expired / limit / not-eligible.
   - Изоляция между событиями: `ensureEventScope` бросает при чужом slug.
   - TTL: `hydrate` чистит state если `lastTouched` старше часа.
3. `tests/unit/unwrapStrapi.spec.ts`:
   - single, collection, empty single (выкидывает 404).
4. `tests/unit/parseStrapiError.spec.ts`:
   - validation `details.errors` → `fields`.
   - 401 / 403 / 404 / 500 → `status` + `message`.

### E2E smoke (Playwright)
`tests/e2e/purchase-flow.spec.ts` — один сценарий:
1. `globalSetup`: запускает `seed.ts`, который через Strapi REST с
   токеном Admin создаёт event, tier, banner. Идемпотентно — если уже
   есть, пропускает.
2. UI-test:
   - Регистрация нового user через `/register`.
   - Открывает `/`, видит seed-event и баннер.
   - Тап на карточку → `/events/[slug]`.
   - Тап «Купить» → `/events/[slug]/checkout`.
   - Степпер +2 на одном tier.
   - Тап «Оформить» → `/events/[slug]/checkout/pay`.
   - Заполняет 2 анкеты.
   - Выбирает `card`.
   - Чекает консент.
   - Тап «Оплатить» → `/orders/[id]/pay` → «Симулировать оплату» →
     `/tickets`.
   - Видит 2 строки в списке. Тап на одну → `/tickets/[id]` →
     QR-канвас отрендерился (`canvas !== blank`).

E2E запускается командой `npm run test:e2e`. Не входит в `npm test`.
В CI добавится позже (отдельный тикет).

## 15. Definition of Done

- [ ] `npm run dev` (Nuxt) и `make dev` (compose) поднимают стек,
      Traefik роутит `app.localhost` и `api.localhost`.
- [ ] Главная (`/`) показывает баннеры и ленту опубликованных событий
      из реальной БД; пустая БД → `AppEmpty`.
- [ ] `/events/[slug]` рендерит все блоки из screens.md (hero,
      организатор, программа, спикеры, прошлые фото, карта, цена-from-to,
      кнопка «Купить»).
- [ ] Полный e2e-сценарий покупки в браузере проходит вручную:
      регистрация → главная → детали → выбор 2 билетов →
      валидный промокод → checkout с 2 анкетами → mark-paid →
      `/tickets` → `/tickets/[id]` с QR.
- [ ] QR на `/tickets/[id]` сканится (валидируется бэк-secret через
      внутренний endpoint или вручную скриптом).
- [ ] «Мне интересно» (favorites) работает оптимистично на карточках и
      детали; список в `/account/favorites` синхронизирован.
- [ ] Поиск (`/search?q=`) с debounce; пустые результаты дают `AppEmpty`.
- [ ] ЛК: профиль, sessions (перенесено), favorites, become-speaker
      (заявка создаётся в БД), contact-manager (заявка создаётся в БД),
      logout.
- [ ] `/orders/[id]/pay` отдаёт 404 при `NUXT_PUBLIC_APP_ENV=production`.
- [ ] Все Vitest-тесты зелёные.
- [ ] Playwright e2e-смоук проходит локально.
- [ ] `npm run build` без TypeScript-ошибок.
- [ ] PWA-манифест валиден (Lighthouse «Installable» PASS).
- [ ] Bottom-nav: на mobile sticky внизу с safe-area; на `≥lg` скрыт,
      работает top-nav.
- [ ] Все тексты RU; никаких артефактов EN-плейсхолдеров на
      пользовательских экранах.
- [ ] Conventional commits на русском (`feat(frontend): ...`).

## 16. Открытые вопросы (вне v1)

- Native-сборка iOS/Android — отдельный спек (включая `@capacitor/share`,
  push-уведомления, deep-link).
- Реальный платёжный шлюз — заменит mock-pay.
- Email-confirmation flow при регистрации.
- PDF-генерация билета (сейчас PNG).
- Карта как SDK (Yandex/Leaflet) с маркером и навигацией.
- Push-уведомления (напоминания за день, статусы заказа).
- Multi-language UI (uz/en).
- Возврат билетов из UI.
- Редактирование профиля пользователем (`fullName`/`phone`/`avatar`)
  — нужен `PUT /users/me` + UI.
- Pagination/infinite-scroll на главной и в поиске.
- E2E в CI (`docker compose` + Playwright).
- Доменная страница спикера — если бэк не отдаёт нужные populate,
  убираем из v1 (заменяем компактной карточкой в overlay/tooltip).
