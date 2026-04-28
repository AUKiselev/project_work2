# Frontend: первоначальная структура (Nuxt 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать пользовательскую часть платформы билетов на Nuxt 4 + Pinia + Tailwind v4 + Nuxt UI v4 против готового Strapi 5 API: 8 экранов из `screens.md` + ЛК, RU only, dark-only, mobile-first, PWA. Полный e2e-сценарий покупки в браузере.

**Architecture:** Nuxt 4 file-based routing без FSD; domain-группировка в `app/components/<domain>/`. Pinia только для cross-page состояния (`auth`, `cart`, `favorites`); read-only данные — composables с `useAsyncData`. `$api` (single-flight refresh уже есть) — единая точка для запросов. Mock-pay через dev-страницу `/orders/[id]/pay` с гардом `NUXT_PUBLIC_APP_ENV !== 'production'`. Native-сборка вне скоупа v1.

**Tech Stack:** Nuxt 4.4, Vue 3.5, Pinia 3, VueUse 14, Tailwind v4, Nuxt UI v4, vite-pwa, qrcode, zod 4, dompurify. Тесты: Vitest + happy-dom (unit) + Playwright (e2e smoke).

**Spec:** `docs/superpowers/specs/2026-04-28-frontend-initial-structure-design.md`.

---

## Глобальные конвенции для всех тасков

- **Working directory:** `apps/frontend/` (если в команде нет явного префикса).
- **Имя ветки:** `main` (фронт пилим прямо в main, как договорились — каждый таск = отдельный коммит).
- **Команды запуска:**
  - `npm run dev` — Nuxt dev-сервер.
  - `npm run build` — продовая сборка (используем для проверки типов в DoD).
  - `npm run test` — Vitest unit-тесты.
  - `npm run test:e2e` — Playwright e2e (появится в Task 35).
- **TypeScript:** strict-режим уже включён через `nuxt prepare`. Никакого `any` без комментария-обоснования.
- **Импорты:** алиас `~/` указывает на `apps/frontend/app/`. Импорты типов — `import type { ... }`.
- **Vue SFC:** только `<script setup lang="ts">`. Никаких options API.
- **i18n:** RU only. Тексты пишем по-русски прямо в шаблонах.
- **Стилизация:** Tailwind v4 утилиты + Nuxt UI компоненты; dark-only — учитываем `text-slate-100` на `bg-slate-950`.
- **Логирование:** не логируем `qrPayload`, `attendee.email`, `attendee.phone`, токены.
- **Comments-policy:** на каждом нетривиальном файле — короткий header-комментарий (1–3 строки) с предназначением. Внутри функций — только если "почему" не очевидно.
- **Commit:** Conventional Commits на русском, по одному осмысленному коммиту на таск. Пример: `feat(frontend): добавить ленту событий на главной`.
- **TDD:** для `utils/`, `stores/`, `composables/` (где есть нетривиальная логика) — сначала тест, потом реализация. Для компонентов и страниц — без юнит-тестов; покрытие через ручной smoke + Playwright e2e в конце.

---

## Task 1: Инфраструктура Vitest

**Files:**
- Create: `apps/frontend/vitest.config.ts`
- Create: `apps/frontend/tests/unit/sanity.spec.ts`
- Modify: `apps/frontend/package.json` (devDependencies + scripts)

- [ ] **Step 1: Установить dev-зависимости**

```bash
cd apps/frontend && npm i -D vitest@^3 @vue/test-utils@^2 happy-dom@^15
```

- [ ] **Step 2: Создать `apps/frontend/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/unit/**/*.{spec,test}.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Добавить scripts в `package.json`**

В блок `scripts` дописать:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 4: Создать sanity-тест `tests/unit/sanity.spec.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('Vitest works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Запустить тесты, ожидать PASS**

Run: `npm test`
Expected: `sanity > Vitest works PASS`. 1 passed.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/vitest.config.ts apps/frontend/tests apps/frontend/package.json apps/frontend/package-lock.json
git commit -m "chore(frontend): добавить vitest для unit-тестов"
```

---

## Task 2: Установка Nuxt UI v4 и runtime-зависимостей

**Files:**
- Modify: `apps/frontend/package.json`
- Modify: `apps/frontend/nuxt.config.ts`
- Create: `apps/frontend/app/app.config.ts`

- [ ] **Step 1: Установить runtime-зависимости**

```bash
cd apps/frontend && npm i @nuxt/ui@^4 qrcode@^1.5 zod@^4 dompurify@^3
npm i -D @types/qrcode @types/dompurify
```

- [ ] **Step 2: Подключить модуль в `nuxt.config.ts`**

В массив `modules` добавить `'@nuxt/ui'`. В `runtimeConfig.public` добавить `appEnv: ''`. Полный фрагмент:

```ts
modules: [
  '@pinia/nuxt',
  '@vueuse/nuxt',
  '@vite-pwa/nuxt',
  '@nuxt/ui',
],
runtimeConfig: {
  apiSecret: '',
  public: {
    siteUrl: '',
    apiBase: '',
    refreshCookieName: 'strapi_up_refresh',
    appEnv: '',
  },
},
```

- [ ] **Step 3: Создать `apps/frontend/app/app.config.ts`**

```ts
// Тема Nuxt UI v4: dark-only, primary indigo, gray slate. Менять
// тему нельзя — переключатель не реализуется в v1.
export default defineAppConfig({
  ui: {
    primary: 'indigo',
    gray: 'slate',
    icons: { dynamic: true },
  },
});
```

- [ ] **Step 4: Зафиксировать dark-режим в `app/app.vue`**

Перезаписать содержимое `apps/frontend/app/app.vue`:

```vue
<template>
  <Html lang="ru" class="dark">
    <Body class="bg-slate-950 text-slate-100">
      <NuxtRouteAnnouncer />
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
      <UNotifications />
    </Body>
  </Html>
</template>
```

- [ ] **Step 5: Запустить `npm run dev`, открыть `app.localhost`**

Run: `npm run dev` (в Docker — уже запущено). Открыть в браузере. Ожидать: страница рендерится, `<UNotifications/>` примонтирован (виден в Vue Devtools), HTML-тег имеет класс `dark`. Никаких ошибок в консоли.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/package.json apps/frontend/package-lock.json apps/frontend/nuxt.config.ts apps/frontend/app/app.config.ts apps/frontend/app/app.vue
git commit -m "feat(frontend): подключить Nuxt UI v4 и runtime-зависимости (qrcode, zod, dompurify)"
```

---

## Task 3: Утилита форматирования (`utils/format.ts`) — TDD

**Files:**
- Test: `apps/frontend/tests/unit/format.spec.ts`
- Create: `apps/frontend/app/utils/format.ts`

- [ ] **Step 1: Написать failing-тест `tests/unit/format.spec.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { formatPrice, formatDate, formatDateRange } from '~/utils/format';

describe('formatPrice', () => {
  it('форматирует копейки в рубли с разрядами', () => {
    expect(formatPrice(990000, 'RUB')).toBe('9 900 ₽');
    expect(formatPrice(150, 'RUB')).toBe('1 ₽'); // 150 копеек = 1.50 руб → 2 руб (округление в большую — но мы храним целые рубли в минимальных единицах = копейки)
  });
  it('zero → "Бесплатно"', () => {
    expect(formatPrice(0, 'RUB')).toBe('Бесплатно');
  });
});

describe('formatDate', () => {
  it('форматирует ISO в "12 мая 2026, 13:00" в Europe/Moscow', () => {
    const out = formatDate('2026-05-12T10:00:00Z', 'Europe/Moscow');
    expect(out).toBe('12 мая 2026, 13:00');
  });
});

describe('formatDateRange', () => {
  it('одинаковый день → "12 мая 2026, 10:00 — 18:00"', () => {
    const out = formatDateRange(
      '2026-05-12T07:00:00Z',
      '2026-05-12T15:00:00Z',
      'Europe/Moscow',
    );
    expect(out).toBe('12 мая 2026, 10:00 — 18:00');
  });
  it('разные дни → "12 мая — 14 мая 2026"', () => {
    const out = formatDateRange(
      '2026-05-12T07:00:00Z',
      '2026-05-14T15:00:00Z',
      'Europe/Moscow',
    );
    expect(out).toBe('12 мая — 14 мая 2026');
  });
  it('без endsAt → один formatDate', () => {
    const out = formatDateRange('2026-05-12T07:00:00Z', undefined, 'Europe/Moscow');
    expect(out).toBe('12 мая 2026, 10:00');
  });
});
```

- [ ] **Step 2: Запустить тесты — ожидать FAIL**

Run: `npm test`
Expected: FAIL (`Cannot find module '~/utils/format'`).

- [ ] **Step 3: Реализовать `apps/frontend/app/utils/format.ts`**

```ts
// Форматирование цены, даты и диапазона дат для UI. Цены приходят
// с бэка в минимальных единицах (копейки) — делим на 100.

const RUB_FORMATTER = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const DATE_FORMATTER_TIME = (tz: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  });

const DATE_FORMATTER_DAY = (tz: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: tz,
  });

const DATE_FORMATTER_DAY_YEAR = (tz: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: tz,
  });

const TIME_FORMATTER = (tz: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  });

export function formatPrice(amountMinor: number, currency: 'RUB'): string {
  if (amountMinor === 0) return 'Бесплатно';
  // Округляем до целых рублей: бэк хранит целые копейки.
  const rubles = Math.round(amountMinor / 100);
  return RUB_FORMATTER.format(rubles).replace(/ /g, ' ');
}

export function formatDate(iso: string, tz = 'Europe/Moscow'): string {
  const d = new Date(iso);
  return DATE_FORMATTER_TIME(tz).format(d).replace(' г.', '').replace(/ /g, ' ').replace(' в ', ', ');
}

export function formatDateRange(
  startIso: string,
  endIso: string | undefined,
  tz = 'Europe/Moscow',
): string {
  if (!endIso) return formatDate(startIso, tz);
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay =
    start.toLocaleDateString('ru-RU', { timeZone: tz }) ===
    end.toLocaleDateString('ru-RU', { timeZone: tz });
  if (sameDay) {
    const dayPart = DATE_FORMATTER_DAY_YEAR(tz).format(start).replace(' г.', '');
    const startTime = TIME_FORMATTER(tz).format(start);
    const endTime = TIME_FORMATTER(tz).format(end);
    return `${dayPart}, ${startTime} — ${endTime}`;
  }
  const startDay = DATE_FORMATTER_DAY(tz).format(start);
  const endDayYear = DATE_FORMATTER_DAY_YEAR(tz).format(end).replace(' г.', '');
  return `${startDay} — ${endDayYear}`;
}
```

- [ ] **Step 4: Прогнать тесты — ожидать PASS**

Run: `npm test`
Expected: 6 passed (3 описания × кейсы).

При несовпадении строк (Intl выдаёт точку в конце «12 мая 2026 г.») — увидеть фактический output в FAIL и обновить либо нормализацию в utils, либо ожидаемые строки в тесте. Финал: тест зелёный, оба варианта согласованы.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/app/utils/format.ts apps/frontend/tests/unit/format.spec.ts
git commit -m "feat(frontend): добавить utils форматирования цены и дат"
```

---

## Task 4: Утилита Strapi-API (`utils/api.ts`) — TDD

**Files:**
- Test: `apps/frontend/tests/unit/api.spec.ts`
- Create: `apps/frontend/app/utils/api.ts`
- Create: `apps/frontend/app/types/api.ts` (минимальный stub — расширим в Task 6)

- [ ] **Step 1: Создать stub `app/types/api.ts`**

```ts
// Stub типов Strapi — расширяется в Task 6.
export interface StrapiSingle<T> { data: T | null }
export interface StrapiCollection<T> {
  data: T[];
  meta?: { pagination?: { page: number; pageSize: number; pageCount: number; total: number } };
}
export interface StrapiErrorEnvelope {
  error: {
    status: number;
    name: string;
    message: string;
    details?: { errors?: Array<{ path: string[]; message: string; name?: string }> };
  };
}
```

- [ ] **Step 2: Написать failing-тест `tests/unit/api.spec.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { unwrapStrapi, parseStrapiError } from '~/utils/api';

describe('unwrapStrapi', () => {
  it('single → объект', () => {
    expect(unwrapStrapi({ data: { id: 1, slug: 'x' } })).toEqual({ id: 1, slug: 'x' });
  });
  it('collection → массив', () => {
    expect(unwrapStrapi({ data: [{ id: 1 }, { id: 2 }] })).toEqual([{ id: 1 }, { id: 2 }]);
  });
  it('null single → бросает 404', () => {
    expect(() => unwrapStrapi({ data: null })).toThrowError(/not found/i);
  });
});

describe('parseStrapiError', () => {
  it('validation 400 с details.errors → fields', () => {
    const err = {
      response: { status: 400 },
      data: {
        error: {
          status: 400, name: 'ValidationError', message: 'Validation failed',
          details: { errors: [{ path: ['email'], message: 'invalid email' }] },
        },
      },
    };
    const out = parseStrapiError(err);
    expect(out.status).toBe(400);
    expect(out.message).toBe('Validation failed');
    expect(out.fields).toEqual({ email: 'invalid email' });
  });
  it('401 без details → status+message', () => {
    const err = { response: { status: 401 }, data: { error: { status: 401, name: 'UnauthorizedError', message: 'Invalid credentials' } } };
    const out = parseStrapiError(err);
    expect(out.status).toBe(401);
    expect(out.message).toBe('Invalid credentials');
    expect(out.fields).toBeUndefined();
  });
  it('сетевая ошибка без response → status=0', () => {
    const out = parseStrapiError(new Error('Network down'));
    expect(out.status).toBe(0);
    expect(out.message).toMatch(/network|down|ошибк/i);
  });
});
```

- [ ] **Step 3: Реализовать `apps/frontend/app/utils/api.ts`**

```ts
// Хелперы для работы с REST-ответами Strapi 5.
import type { StrapiCollection, StrapiSingle, StrapiErrorEnvelope } from '~/types/api';

export interface ParsedApiError {
  status: number;
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export function unwrapStrapi<T>(res: StrapiSingle<T>): T;
export function unwrapStrapi<T>(res: StrapiCollection<T>): T[];
export function unwrapStrapi<T>(res: StrapiSingle<T> | StrapiCollection<T>): T | T[] {
  const data = (res as { data: unknown }).data;
  if (data === null || data === undefined) {
    const err: any = new Error('Resource not found');
    err.statusCode = 404;
    throw err;
  }
  return data as any;
}

export function parseStrapiError(err: unknown): ParsedApiError {
  const anyErr = err as any;
  const status: number =
    anyErr?.response?.status ?? anyErr?.statusCode ?? 0;
  const envelope: StrapiErrorEnvelope | undefined = anyErr?.data ?? anyErr?.response?._data;
  const errorObj = envelope?.error;

  if (errorObj) {
    const fields: Record<string, string> | undefined = errorObj.details?.errors?.length
      ? Object.fromEntries(
          errorObj.details.errors.map((e) => [e.path.join('.'), e.message]),
        )
      : undefined;
    return {
      status,
      code: errorObj.name || 'UnknownError',
      message: errorObj.message || 'Что-то пошло не так',
      fields,
    };
  }

  if (status === 0) {
    return {
      status: 0,
      code: 'NetworkError',
      message: anyErr?.message || 'Сетевая ошибка',
    };
  }

  return { status, code: 'UnknownError', message: anyErr?.message || 'Что-то пошло не так' };
}
```

- [ ] **Step 4: Запустить тесты — ожидать PASS**

Run: `npm test`
Expected: все тесты `unwrapStrapi`/`parseStrapiError` зелёные.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/app/utils/api.ts apps/frontend/app/types/api.ts apps/frontend/tests/unit/api.spec.ts
git commit -m "feat(frontend): добавить хелперы Strapi REST (unwrap, parseError)"
```

---

## Task 5: Sanitizer для richtext (`utils/sanitize.ts`)

**Files:**
- Create: `apps/frontend/app/utils/sanitize.ts`
- Test: `apps/frontend/tests/unit/sanitize.spec.ts`

- [ ] **Step 1: Написать тест `tests/unit/sanitize.spec.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '~/utils/sanitize';

describe('sanitizeHtml', () => {
  it('пропускает разрешённые теги', () => {
    expect(sanitizeHtml('<p>hello <strong>world</strong></p>')).toBe(
      '<p>hello <strong>world</strong></p>',
    );
  });
  it('режет <script>', () => {
    expect(sanitizeHtml('<p>x</p><script>alert(1)</script>')).toBe('<p>x</p>');
  });
  it('режет on*-атрибуты', () => {
    expect(sanitizeHtml('<a href="/" onclick="x()">y</a>')).toBe('<a href="/">y</a>');
  });
  it('пропускает <a href> и <img src/alt>', () => {
    expect(sanitizeHtml('<a href="https://example.com">a</a>')).toBe(
      '<a href="https://example.com">a</a>',
    );
    expect(sanitizeHtml('<img src="/x.png" alt="x">')).toMatch(/<img[^>]+src="\/x.png"[^>]*alt="x"/);
  });
});
```

- [ ] **Step 2: Реализовать `app/utils/sanitize.ts`**

```ts
// Whitelist-санитизация richtext перед v-html.
import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'strong', 'em', 'b', 'i', 'u', 's',
  'a', 'img',
  'blockquote', 'code', 'pre',
];
const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'target', 'rel'];

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    KEEP_CONTENT: true,
  });
}
```

- [ ] **Step 3: Прогнать тесты — ожидать PASS**

Run: `npm test`
Expected: все 4 кейса зелёные.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/app/utils/sanitize.ts apps/frontend/tests/unit/sanitize.spec.ts
git commit -m "feat(frontend): добавить sanitizer richtext через dompurify"
```

---

## Task 6: Полные DTO-типы (`types/api.ts`)

**Files:**
- Modify: `apps/frontend/app/types/api.ts`

- [ ] **Step 1: Расширить `app/types/api.ts`**

Перезаписать содержимое файла полным набором DTO согласно §5 спека:

```ts
// DTO для Strapi 5 REST. Бэк отдаёт плоские объекты внутри { data, meta }
// (без legacy attributes-обёртки). Все цены — целые копейки, валюта RUB.

export interface StrapiSingle<T> { data: T | null }
export interface StrapiCollection<T> {
  data: T[];
  meta?: { pagination?: { page: number; pageSize: number; pageCount: number; total: number } };
}

export interface StrapiErrorEnvelope {
  error: {
    status: number;
    name: string;
    message: string;
    details?: { errors?: Array<{ path: string[]; message: string; name?: string }> };
  };
}

export interface MediaFormat { url: string; width?: number; height?: number }
export interface MediaFile {
  id: number;
  url: string;
  width?: number;
  height?: number;
  mime?: string;
  formats?: { thumbnail?: MediaFormat; small?: MediaFormat; medium?: MediaFormat; large?: MediaFormat };
}

export interface Venue {
  id: number;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  mapEmbed?: string;
}

export interface Organizer {
  id: number;
  name: string;
  logo?: MediaFile;
  description?: string;
}

export interface Speaker {
  id: number;
  documentId: string;
  slug: string;
  fullName: string;
  photo?: MediaFile;
  bio?: string;
  social?: Record<string, string>;
}

export interface AgendaItem {
  id: number;
  startsAt: string;
  endsAt?: string;
  title: string;
  description?: string;
  speakers?: Speaker[];
}

export interface TicketTier {
  id: number;
  documentId: string;
  name: string;
  description?: string;
  includes?: string;
  price: number;
  currency: 'RUB';
  sortOrder: number;
  event?: Pick<Event, 'id' | 'slug' | 'title'>;
}

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'archived';

export interface Event {
  id: number;
  documentId: string;
  slug: string;
  title: string;
  shortDescription?: string;
  description?: string;
  coverImage?: MediaFile;
  gallery?: MediaFile[];
  pastGallery?: MediaFile[];
  startsAt: string;
  endsAt?: string;
  timezone: string;
  capacity?: number;
  status: EventStatus;
  venue?: Venue;
  organizer?: Organizer;
  speakers?: Speaker[];
  agenda?: AgendaItem[];
  tiers?: TicketTier[];
}

export interface Banner {
  id: number;
  title: string;
  image: MediaFile;
  url?: string;
  priority: number;
  activeFrom?: string;
  activeUntil?: string;
}

export interface Attendee {
  fullName: string;
  email?: string;
  phone?: string;
  extra?: Record<string, unknown>;
}

export interface OrderItem {
  id: number;
  quantity: number;
  unitPrice: number;
  tier?: TicketTier;
}

export type PaymentMethod = 'card' | 'sbp' | 'invoice';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  id: number;
  documentId: string;
  number: string;
  subtotal: number;
  discount: number;
  total: number;
  currency: 'RUB';
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  personalDataConsentAt?: string;
  items?: OrderItem[];
  tickets?: Ticket[];
  promoCode?: { id: number; code: string };
  createdAt?: string;
}

export type TicketStatus = 'valid' | 'used' | 'refunded' | 'cancelled';

export interface Ticket {
  id: number;
  documentId: string;
  number: string;
  qrPayload?: string;
  status: TicketStatus;
  attendee: Attendee;
  usedAt?: string;
  order?: Pick<Order, 'id' | 'number'>;
  tier?: Pick<TicketTier, 'id' | 'name' | 'price' | 'currency' | 'description'>;
  event?: Pick<Event, 'id' | 'slug' | 'title' | 'startsAt' | 'endsAt' | 'timezone' | 'venue' | 'organizer'>;
}

export interface Favorite {
  id: number;
  event: Pick<Event, 'id' | 'slug' | 'title' | 'startsAt' | 'coverImage'>;
}

export type PromoFailReason = 'expired' | 'limit' | 'not-eligible' | 'invalid' | null;

export interface PreviewPromoResponse {
  subtotal: number;
  discount: number;
  total: number;
  applied: boolean;
  reason: PromoFailReason;
}

export interface CreateOrderPayload {
  eventId: number;
  items: { tierId: number; quantity: number }[];
  promoCode?: string;
  paymentMethod: PaymentMethod;
  personalDataConsent: true;
  attendees: Attendee[];
}

export interface SpeakerApplicationPayload {
  fullName: string;
  email: string;
  topic?: string;
  description?: string;
}

export interface ManagerContactPayload {
  subject: string;
  message: string;
  contactBack?: string;
}
```

- [ ] **Step 2: Прогнать тесты, удостовериться что ничего не упало**

Run: `npm test`
Expected: все тесты по-прежнему зелёные (старые stub-импорты совместимы).

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/app/types/api.ts
git commit -m "feat(frontend): добавить полный набор DTO для Strapi REST"
```

---

## Task 7: Pinia store `cart.ts` — TDD

**Files:**
- Test: `apps/frontend/tests/unit/cart.spec.ts`
- Create: `apps/frontend/app/stores/cart.ts`

- [ ] **Step 1: Написать failing-тест `tests/unit/cart.spec.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCartStore } from '~/stores/cart';

const tier = (id: number, price = 50000) => ({
  id, name: 'Standard', price, currency: 'RUB' as const,
});

beforeEach(() => {
  setActivePinia(createPinia());
  // Чистим persist-storage перед каждым тестом.
  globalThis.sessionStorage?.clear?.();
});

describe('cart store', () => {
  it('add нового tier создаёт строку', () => {
    const c = useCartStore();
    c.add(tier(1), 2, 'evt-1');
    expect(c.items).toHaveLength(1);
    expect(c.items[0].qty).toBe(2);
    expect(c.eventSlug).toBe('evt-1');
  });

  it('add существующего tier инкрементит qty', () => {
    const c = useCartStore();
    c.add(tier(1), 2, 'evt-1');
    c.add(tier(1), 1, 'evt-1');
    expect(c.items[0].qty).toBe(3);
  });

  it('setQty(0) удаляет позицию', () => {
    const c = useCartStore();
    c.add(tier(1), 2, 'evt-1');
    c.setQty(1, 0);
    expect(c.items).toHaveLength(0);
  });

  it('subtotal = sum(price * qty)', () => {
    const c = useCartStore();
    c.add(tier(1, 10000), 2, 'evt-1');
    c.add(tier(2, 5000), 3, 'evt-1');
    expect(c.subtotal).toBe(20000 + 15000);
  });

  it('reset очищает всё', () => {
    const c = useCartStore();
    c.add(tier(1), 1, 'evt-1');
    c.setPromo('SUMMER10');
    c.reset();
    expect(c.items).toHaveLength(0);
    expect(c.eventSlug).toBeNull();
    expect(c.promoCode).toBeNull();
    expect(c.promoApplied).toBeNull();
  });

  it('hydrate с протухшим TTL чистит state', () => {
    const c = useCartStore();
    c.add(tier(1), 1, 'evt-1');
    // Симулируем "час назад":
    c.lastTouched = Date.now() - 3_600_001;
    c.persist();
    // Новый стор — повторяем persist в storage и читаем из него.
    setActivePinia(createPinia());
    const fresh = useCartStore();
    fresh.hydrate();
    expect(fresh.items).toHaveLength(0);
  });

  it('total = subtotal - discount', () => {
    const c = useCartStore();
    c.add(tier(1, 100000), 1, 'evt-1');
    c.promoApplied = { applied: true, subtotal: 100000, discount: 10000, total: 90000, reason: null };
    expect(c.total).toBe(90000);
  });
});
```

- [ ] **Step 2: Запустить тест — FAIL**

Run: `npm test`
Expected: FAIL (нет `~/stores/cart`).

- [ ] **Step 3: Реализовать `app/stores/cart.ts`**

```ts
// Корзина: cross-page state с persist в sessionStorage. TTL 1 час.
// Применение промокода — отдельный action applyPromo, делает запрос
// preview-promo через $api (вызывается со стороны useOrder, чтобы
// store не зависел от Nuxt-плагинов).
import { defineStore } from 'pinia';
import type { PreviewPromoResponse, TicketTier } from '~/types/api';

const STORAGE_KEY = 'pw2.cart';
const TTL_MS = 3_600_000; // 1 час

export interface CartItem {
  tierId: number;
  qty: number;
  snapshot: { name: string; price: number; currency: 'RUB' };
}

interface CartState {
  eventSlug: string | null;
  items: CartItem[];
  promoCode: string | null;
  promoApplied: PreviewPromoResponse | null;
  lastTouched: number;
}

const initialState = (): CartState => ({
  eventSlug: null,
  items: [],
  promoCode: null,
  promoApplied: null,
  lastTouched: Date.now(),
});

export const useCartStore = defineStore('cart', {
  state: initialState,
  getters: {
    itemsCount: (s) => s.items.reduce((acc, i) => acc + i.qty, 0),
    isEmpty: (s) => s.items.length === 0,
    subtotal: (s) => s.items.reduce((acc, i) => acc + i.snapshot.price * i.qty, 0),
    discount: (s) => s.promoApplied?.applied ? s.promoApplied.discount : 0,
    total(): number {
      return this.subtotal - this.discount;
    },
    byTier: (s) => (id: number) => s.items.find((i) => i.tierId === id),
  },
  actions: {
    add(tier: Pick<TicketTier, 'id' | 'name' | 'price' | 'currency'>, qty: number, eventSlug: string) {
      this._touch();
      if (!this.eventSlug) this.eventSlug = eventSlug;
      const existing = this.items.find((i) => i.tierId === tier.id);
      if (existing) existing.qty += qty;
      else this.items.push({
        tierId: tier.id, qty,
        snapshot: { name: tier.name, price: tier.price, currency: tier.currency },
      });
      this.persist();
    },
    setQty(tierId: number, qty: number) {
      this._touch();
      const i = this.items.findIndex((x) => x.tierId === tierId);
      if (i < 0) return;
      if (qty <= 0) this.items.splice(i, 1);
      else this.items[i].qty = qty;
      if (this.items.length === 0) this.eventSlug = null;
      this.persist();
    },
    remove(tierId: number) { this.setQty(tierId, 0); },
    setPromo(code: string | null) {
      this._touch();
      this.promoCode = code?.trim().toUpperCase() || null;
      this.promoApplied = null;
      this.persist();
    },
    setPromoResult(res: PreviewPromoResponse | null) {
      this.promoApplied = res;
      this.persist();
    },
    reset() {
      const fresh = initialState();
      this.$patch(fresh);
      this.persist();
    },
    persist() {
      if (typeof window === 'undefined') return;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.$state));
    },
    hydrate() {
      if (typeof window === 'undefined') return;
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as CartState;
        if (Date.now() - (parsed.lastTouched ?? 0) > TTL_MS) {
          sessionStorage.removeItem(STORAGE_KEY);
          return;
        }
        this.$patch(parsed);
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    },
    _touch() {
      this.lastTouched = Date.now();
    },
  },
});
```

- [ ] **Step 4: Запустить тесты — PASS**

Run: `npm test`
Expected: все cart-кейсы зелёные.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/app/stores/cart.ts apps/frontend/tests/unit/cart.spec.ts
git commit -m "feat(frontend): добавить store корзины с persist и TTL"
```

---

## Task 8: Pinia store `favorites.ts` — TDD

**Files:**
- Test: `apps/frontend/tests/unit/favorites.spec.ts`
- Create: `apps/frontend/app/stores/favorites.ts`

- [ ] **Step 1: Написать тест `tests/unit/favorites.spec.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFavoritesStore } from '~/stores/favorites';

beforeEach(() => setActivePinia(createPinia()));

describe('favorites store', () => {
  it('has(id) после addLocal/removeLocal', () => {
    const f = useFavoritesStore();
    expect(f.has(42)).toBe(false);
    f.addLocal(42);
    expect(f.has(42)).toBe(true);
    f.removeLocal(42);
    expect(f.has(42)).toBe(false);
  });
  it('reset очищает', () => {
    const f = useFavoritesStore();
    f.addLocal(1); f.addLocal(2);
    f.reset();
    expect(f.has(1)).toBe(false);
    expect(f.loaded).toBe(false);
  });
  it('setLoaded помечает loaded=true', () => {
    const f = useFavoritesStore();
    f.setLoaded([{ id: 10 }, { id: 11 }]);
    expect(f.has(10)).toBe(true);
    expect(f.has(11)).toBe(true);
    expect(f.loaded).toBe(true);
  });
});
```

- [ ] **Step 2: Реализовать `app/stores/favorites.ts`**

```ts
// Кэш id-шников избранных событий + флаг "загружали ли вообще".
// Сетевые операции делает useFavorites composable; стор — чистое
// in-memory хранилище для optimistic UI.
import { defineStore } from 'pinia';

interface FavoritesState {
  ids: Set<number>;
  loaded: boolean;
}

export const useFavoritesStore = defineStore('favorites', {
  state: (): FavoritesState => ({
    ids: new Set<number>(),
    loaded: false,
  }),
  getters: {
    has: (s) => (eventId: number) => s.ids.has(eventId),
    asArray: (s) => Array.from(s.ids),
  },
  actions: {
    setLoaded(events: Array<{ id: number }>) {
      this.ids = new Set(events.map((e) => e.id));
      this.loaded = true;
    },
    addLocal(eventId: number) { this.ids.add(eventId); },
    removeLocal(eventId: number) { this.ids.delete(eventId); },
    reset() {
      this.ids.clear();
      this.loaded = false;
    },
  },
});
```

- [ ] **Step 3: Прогнать тесты — PASS**

Run: `npm test`
Expected: 3 кейса favorites зелёные.

- [ ] **Step 4: Подключить reset в logout (`stores/auth.ts`)**

В `apps/frontend/app/stores/auth.ts`, в actions._clearLocal — добавить вызовы reset для cart и favorites. Найти существующий метод:

```ts
async _clearLocal() {
  this.user = null;
  this.accessToken = null;
  await this._clearRefresh();
},
```

Заменить на:

```ts
async _clearLocal() {
  this.user = null;
  this.accessToken = null;
  await this._clearRefresh();
  // Сбрасываем cross-page состояние, чтобы данные предыдущего user'а
  // не утекли к следующему вошедшему на этом устройстве.
  try {
    const { useCartStore } = await import('~/stores/cart');
    const { useFavoritesStore } = await import('~/stores/favorites');
    useCartStore().reset();
    useFavoritesStore().reset();
  } catch {
    /* стор может быть не инициализирован — это нормально */
  }
},
```

- [ ] **Step 5: Прогнать тесты — PASS**

Run: `npm test`
Expected: все тесты по-прежнему зелёные (cart/favorites/format/api/sanitize).

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/app/stores/favorites.ts apps/frontend/app/stores/auth.ts apps/frontend/tests/unit/favorites.spec.ts
git commit -m "feat(frontend): добавить store избранного и сброс на logout"
```

---

## Task 9: Composables каталога — `useEvents`, `useBanners`

**Files:**
- Create: `apps/frontend/app/composables/useEvents.ts`
- Create: `apps/frontend/app/composables/useBanners.ts`

- [ ] **Step 1: Создать `useEvents.ts`**

```ts
// Каталог событий: list/findBySlug/search.
import type { Event, StrapiCollection, StrapiSingle } from '~/types/api';
import { unwrapStrapi } from '~/utils/api';

interface ListParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  filters?: Record<string, unknown>;
}

const POPULATE_LIST = ['coverImage', 'organizer.logo', 'tiers'];
const POPULATE_DETAIL = [
  'coverImage', 'gallery', 'pastGallery',
  'venue', 'organizer.logo',
  'tiers',
  'speakers.photo',
  'agenda.speakers.photo',
];

export const useEvents = () => {
  const { $api } = useNuxtApp();

  const list = async ({ page = 1, pageSize = 20, sort = 'startsAt:asc', filters }: ListParams = {}): Promise<Event[]> => {
    const query: Record<string, any> = {
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      sort,
    };
    POPULATE_LIST.forEach((p, i) => { query[`populate[${i}]`] = p; });
    if (filters) Object.assign(query, filters);
    const res = await ($api as any)('/events', { query });
    return unwrapStrapi(res as StrapiCollection<Event>);
  };

  const findBySlug = async (slug: string): Promise<Event> => {
    const query: Record<string, any> = { 'filters[slug][$eq]': slug };
    POPULATE_DETAIL.forEach((p, i) => { query[`populate[${i}]`] = p; });
    const res = await ($api as any)('/events', { query });
    const items = unwrapStrapi(res as StrapiCollection<Event>);
    if (!items.length) {
      const err: any = new Error('Event not found');
      err.statusCode = 404;
      throw err;
    }
    return items[0]!;
  };

  const search = async (q: string, { page = 1, pageSize = 20 } = {}): Promise<Event[]> => {
    const query: Record<string, any> = {
      q,
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
    };
    POPULATE_LIST.forEach((p, i) => { query[`populate[${i}]`] = p; });
    const res = await ($api as any)('/events/search', { query });
    return unwrapStrapi(res as StrapiCollection<Event>);
  };

  return { list, findBySlug, search };
};
```

- [ ] **Step 2: Создать `useBanners.ts`**

```ts
// Активные баннеры. Бэк фильтрует активные (activeFrom/activeUntil/priority).
import type { Banner, StrapiCollection } from '~/types/api';
import { unwrapStrapi } from '~/utils/api';

export const useBanners = () => {
  const { $api } = useNuxtApp();

  const list = async (): Promise<Banner[]> => {
    const res = await ($api as any)('/banners', {
      query: { 'populate[0]': 'image', sort: 'priority:desc' },
    });
    return unwrapStrapi(res as StrapiCollection<Banner>);
  };

  return { list };
};
```

- [ ] **Step 3: Smoke — type-check через `npm run build`**

Не запускаем полную сборку, достаточно `nuxt prepare`:

Run: `cd apps/frontend && npx nuxt prepare`
Expected: завершается без ошибок типов.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/app/composables/useEvents.ts apps/frontend/app/composables/useBanners.ts
git commit -m "feat(frontend): добавить composables useEvents и useBanners"
```

---

## Task 10: Composables покупки — `useOrder`, `useTickets`, `useFavorites`, `useCart`

**Files:**
- Create: `apps/frontend/app/composables/useOrder.ts`
- Create: `apps/frontend/app/composables/useTickets.ts`
- Create: `apps/frontend/app/composables/useFavorites.ts`
- Create: `apps/frontend/app/composables/useCart.ts`

- [ ] **Step 1: Создать `useOrder.ts`**

```ts
// Заказы и mock-pay. createOrder/markPaid/findOneMine/listMine.
import type {
  CreateOrderPayload, Order, PreviewPromoResponse, StrapiCollection, StrapiSingle,
} from '~/types/api';
import { unwrapStrapi } from '~/utils/api';

const POPULATE_ORDER = [
  'items.tier', 'tickets.tier', 'tickets.event.venue', 'promoCode',
];

export const useOrder = () => {
  const { $api } = useNuxtApp();

  const previewPromo = async (payload: {
    eventId: number;
    items: { tierId: number; quantity: number }[];
    promoCode?: string;
  }): Promise<PreviewPromoResponse> => {
    const res = await ($api as any)('/orders/preview-promo', { method: 'POST', body: payload });
    return res as PreviewPromoResponse;
  };

  const create = async (payload: CreateOrderPayload): Promise<Order> => {
    const res = await ($api as any)('/orders', { method: 'POST', body: payload });
    return unwrapStrapi(res as StrapiSingle<Order>);
  };

  const markPaid = async (id: number): Promise<Order> => {
    const res = await ($api as any)(`/orders/${id}/mark-paid`, { method: 'POST' });
    return unwrapStrapi(res as StrapiSingle<Order>);
  };

  const listMine = async (): Promise<Order[]> => {
    const query: Record<string, any> = { sort: 'createdAt:desc' };
    POPULATE_ORDER.forEach((p, i) => { query[`populate[${i}]`] = p; });
    const res = await ($api as any)('/me/orders', { query });
    return unwrapStrapi(res as StrapiCollection<Order>);
  };

  const findOneMine = async (id: number): Promise<Order> => {
    const query: Record<string, any> = {};
    POPULATE_ORDER.forEach((p, i) => { query[`populate[${i}]`] = p; });
    const res = await ($api as any)(`/me/orders/${id}`, { query });
    return unwrapStrapi(res as StrapiSingle<Order>);
  };

  return { previewPromo, create, markPaid, listMine, findOneMine };
};
```

- [ ] **Step 2: Создать `useTickets.ts`**

```ts
// Билеты пользователя. listMine/findOneMine.
import type { StrapiCollection, StrapiSingle, Ticket } from '~/types/api';
import { unwrapStrapi } from '~/utils/api';

const POPULATE_TICKET_LIST = ['event.coverImage', 'event.venue', 'tier'];
const POPULATE_TICKET_ONE = [
  'event.coverImage', 'event.venue', 'event.organizer.logo',
  'tier', 'order.tickets.event.venue',
];

export const useTickets = () => {
  const { $api } = useNuxtApp();

  const listMine = async (): Promise<Ticket[]> => {
    const query: Record<string, any> = { sort: 'event.startsAt:asc' };
    POPULATE_TICKET_LIST.forEach((p, i) => { query[`populate[${i}]`] = p; });
    const res = await ($api as any)('/me/tickets', { query });
    return unwrapStrapi(res as StrapiCollection<Ticket>);
  };

  const findOneMine = async (id: number): Promise<Ticket> => {
    const query: Record<string, any> = {};
    POPULATE_TICKET_ONE.forEach((p, i) => { query[`populate[${i}]`] = p; });
    const res = await ($api as any)(`/me/tickets/${id}`, { query });
    return unwrapStrapi(res as StrapiSingle<Ticket>);
  };

  return { listMine, findOneMine };
};
```

- [ ] **Step 3: Создать `useFavorites.ts`**

```ts
// Избранное: тонкая обёртка над favoritesStore + сетевые операции.
import type { Favorite, StrapiCollection } from '~/types/api';
import { unwrapStrapi } from '~/utils/api';
import { useFavoritesStore } from '~/stores/favorites';

export const useFavorites = () => {
  const { $api } = useNuxtApp();
  const store = useFavoritesStore();

  const ensureLoaded = async (): Promise<void> => {
    if (store.loaded) return;
    const res = await ($api as any)('/me/favorites', {
      query: { 'populate[0]': 'event.coverImage' },
    });
    const favs = unwrapStrapi(res as StrapiCollection<Favorite>);
    store.setLoaded(favs.map((f) => f.event));
  };

  const listMine = async (): Promise<Favorite[]> => {
    const res = await ($api as any)('/me/favorites', {
      query: { 'populate[0]': 'event.coverImage' },
    });
    const favs = unwrapStrapi(res as StrapiCollection<Favorite>);
    store.setLoaded(favs.map((f) => f.event));
    return favs;
  };

  const add = async (eventId: number): Promise<void> => {
    store.addLocal(eventId);
    try {
      await ($api as any)('/favorites', { method: 'POST', body: { eventId } });
    } catch (err) {
      store.removeLocal(eventId);
      throw err;
    }
  };

  const remove = async (eventId: number): Promise<void> => {
    store.removeLocal(eventId);
    try {
      await ($api as any)(`/favorites/${eventId}`, { method: 'DELETE' });
    } catch (err) {
      store.addLocal(eventId);
      throw err;
    }
  };

  const isFavorite = (eventId: number) => store.has(eventId);

  return { ensureLoaded, listMine, add, remove, isFavorite };
};
```

- [ ] **Step 4: Создать `useCart.ts`**

```ts
// Тонкая обёртка над cartStore + applyPromo через useOrder.
import { useCartStore } from '~/stores/cart';
import { useOrder } from '~/composables/useOrder';

export const useCart = () => {
  const store = useCartStore();
  const order = useOrder();

  const applyPromo = async (eventId: number) => {
    if (!store.promoCode) return;
    const items = store.items.map((i) => ({ tierId: i.tierId, quantity: i.qty }));
    if (items.length === 0) return;
    try {
      const res = await order.previewPromo({ eventId, items, promoCode: store.promoCode });
      store.setPromoResult(res);
    } catch {
      store.setPromoResult({ subtotal: store.subtotal, discount: 0, total: store.subtotal, applied: false, reason: 'invalid' });
    }
  };

  return { store, applyPromo };
};
```

- [ ] **Step 5: Прогнать `nuxt prepare`**

Run: `npx nuxt prepare`
Expected: без ошибок типов.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/app/composables/useOrder.ts apps/frontend/app/composables/useTickets.ts apps/frontend/app/composables/useFavorites.ts apps/frontend/app/composables/useCart.ts
git commit -m "feat(frontend): добавить composables заказов, билетов, избранного и корзины"
```

---

## Task 11: Composables форм и share — `useSpeakerApplication`, `useManagerContact`, `useShare`

**Files:**
- Create: `apps/frontend/app/composables/useSpeakerApplication.ts`
- Create: `apps/frontend/app/composables/useManagerContact.ts`
- Create: `apps/frontend/app/composables/useShare.ts`

- [ ] **Step 1: Создать `useSpeakerApplication.ts`**

```ts
import type { SpeakerApplicationPayload } from '~/types/api';

export const useSpeakerApplication = () => {
  const { $api } = useNuxtApp();
  const submit = async (payload: SpeakerApplicationPayload) => {
    await ($api as any)('/speaker-applications', { method: 'POST', body: { data: payload } });
  };
  return { submit };
};
```

- [ ] **Step 2: Создать `useManagerContact.ts`**

```ts
import type { ManagerContactPayload } from '~/types/api';

export const useManagerContact = () => {
  const { $api } = useNuxtApp();
  const submit = async (payload: ManagerContactPayload) => {
    await ($api as any)('/manager-contact-requests', { method: 'POST', body: { data: payload } });
  };
  return { submit };
};
```

- [ ] **Step 3: Создать `useShare.ts`**

```ts
// navigator.share с fallback на clipboard + toast.
import { useClipboard } from '@vueuse/core';

export const useShare = () => {
  const { copy } = useClipboard();
  const toast = useToast();

  const share = async ({ title, text, url }: { title?: string; text?: string; url: string }) => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err: any) {
        // AbortError = пользователь закрыл sheet — молчим.
        if (err?.name === 'AbortError') return;
        // Иначе — fallback.
      }
    }
    await copy(url);
    toast.add({ title: 'Ссылка скопирована' });
  };

  return { share };
};
```

- [ ] **Step 4: `npx nuxt prepare`**

Run: `npx nuxt prepare`
Expected: без ошибок типов.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/app/composables/useSpeakerApplication.ts apps/frontend/app/composables/useManagerContact.ts apps/frontend/app/composables/useShare.ts
git commit -m "feat(frontend): добавить composables заявок и share"
```

---

## Task 12: Глобальный обработчик ошибок API

**Files:**
- Modify: `apps/frontend/app/plugins/api.ts`

- [ ] **Step 1: Расширить `plugins/api.ts` — добавить onResponseError для toast**

В существующий plugin добавить обработчик: 5xx и сетевые ошибки → toast «Сервер недоступен»; 4xx (не 401) с `error.message` → toast с этим сообщением, **кроме** 400 — те пробрасываем без toast (формы сами рисуют поля).

Полный новый файл:

```ts
/**
 * $api — обёртка над $fetch с baseURL, авто-инжекцией Bearer и
 * single-flight авто-рефрешем на 401. Глобальный toast для
 * сетевых/5xx ошибок (не 400/401).
 */
import { useAuthStore } from '~/stores/auth';
import { parseStrapiError } from '~/utils/api';

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();

  let refreshing: Promise<boolean> | null = null;
  const ensureRefreshed = (auth: ReturnType<typeof useAuthStore>): Promise<boolean> => {
    if (!refreshing) {
      refreshing = auth.refresh().finally(() => { refreshing = null; });
    }
    return refreshing;
  };

  const api = $fetch.create({
    baseURL: config.public.apiBase,
    credentials: 'include',
    onRequest({ options }) {
      const auth = useAuthStore();
      if (auth.accessToken) {
        const headers = new Headers(options.headers as HeadersInit | undefined);
        headers.set('Authorization', `Bearer ${auth.accessToken}`);
        options.headers = headers;
      }
    },
  });

  const showToastForError = (err: any) => {
    const parsed = parseStrapiError(err);
    // 0 (network) и 5xx — общий toast.
    if (parsed.status === 0 || parsed.status >= 500) {
      try {
        const toast = nuxtApp.runWithContext(() => useToast());
        toast.add({ color: 'red', title: 'Сервер недоступен', description: parsed.message });
      } catch {/* SSR */}
      return;
    }
    // 401 — обработается single-flight выше; здесь не трогаем.
    // 400 — формы сами покажут ошибки; не toast'им.
    // 4xx прочие — короткий toast.
    if (parsed.status >= 401 && parsed.status < 500 && parsed.status !== 400 && parsed.status !== 401) {
      try {
        const toast = nuxtApp.runWithContext(() => useToast());
        toast.add({ color: 'red', title: 'Ошибка', description: parsed.message });
      } catch {/* SSR */}
    }
  };

  const $api: typeof api = (async (request: any, opts: any = {}) => {
    try {
      return await api(request, opts);
    } catch (err: any) {
      const status = err?.response?.status ?? err?.statusCode;
      if (status === 401 && !opts.__retried) {
        const auth = useAuthStore();
        const ok = await ensureRefreshed(auth);
        if (ok) return api(request, { ...opts, __retried: true });
      }
      // Один глобальный toast (не для validation 400 и не для 401).
      showToastForError(err);
      throw err;
    }
  }) as typeof api;

  return { provide: { api: $api } };
});
```

- [ ] **Step 2: `npx nuxt prepare`** — без ошибок типов.

- [ ] **Step 3: Smoke в браузере**

Run: `npm run dev`. Открыть страницу. В Network отключить интернет (DevTools → Offline). Тапнуть «Войти». Ожидать toast «Сервер недоступен».

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/app/plugins/api.ts
git commit -m "feat(frontend): глобальный toast для 5xx/network ошибок API"
```

---

## Task 13: Layout-компоненты — `AppTopNav`, `AppBottomNav`, `AppBackButton`

**Files:**
- Create: `apps/frontend/app/components/layout/AppTopNav.vue`
- Create: `apps/frontend/app/components/layout/AppBottomNav.vue`
- Create: `apps/frontend/app/components/common/AppBackButton.vue`

- [ ] **Step 1: `AppTopNav.vue`**

```vue
<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore();

const onLogout = async () => {
  await auth.logout();
  await navigateTo('/login');
};
</script>

<template>
  <header class="hidden lg:flex items-center justify-between px-6 py-4 border-b border-slate-800">
    <NuxtLink to="/" class="text-lg font-semibold tracking-tight">ProjectWork2</NuxtLink>
    <nav class="flex items-center gap-6 text-sm">
      <NuxtLink to="/" class="hover:text-white">Главная</NuxtLink>
      <NuxtLink to="/search" class="hover:text-white">Поиск</NuxtLink>
      <template v-if="auth.isAuthenticated">
        <NuxtLink to="/tickets" class="hover:text-white">Билеты</NuxtLink>
        <NuxtLink to="/account" class="hover:text-white">{{ auth.user?.username }}</NuxtLink>
        <UButton size="xs" color="gray" variant="soft" @click="onLogout">Выйти</UButton>
      </template>
      <template v-else>
        <NuxtLink to="/login" class="hover:text-white">Войти</NuxtLink>
        <NuxtLink to="/register" class="hover:text-white">Регистрация</NuxtLink>
      </template>
    </nav>
  </header>
</template>
```

- [ ] **Step 2: `AppBottomNav.vue`**

```vue
<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore();
const route = useRoute();

interface NavItem { to: string; label: string; icon: string; activeIcon?: string; auth?: boolean }
const items: NavItem[] = [
  { to: '/', label: 'Главная', icon: 'i-heroicons-home' },
  { to: '/search', label: 'Поиск', icon: 'i-heroicons-magnifying-glass' },
  { to: '/tickets', label: 'Билеты', icon: 'i-heroicons-ticket', auth: true },
  { to: '/account', label: 'Профиль', icon: 'i-heroicons-user-circle', auth: true },
];

const onTap = async (item: NavItem) => {
  if (item.auth && !auth.isAuthenticated) {
    await navigateTo({ path: '/login', query: { redirect: item.to } });
    return;
  }
  await navigateTo(item.to);
};

const isActive = (to: string) => to === '/' ? route.path === '/' : route.path.startsWith(to);
</script>

<template>
  <nav
    class="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur"
    :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }"
  >
    <ul class="grid grid-cols-4">
      <li v-for="item in items" :key="item.to">
        <button
          type="button"
          class="w-full flex flex-col items-center gap-1 py-2 text-xs"
          :class="isActive(item.to) ? 'text-indigo-400' : 'text-slate-400'"
          @click="onTap(item)"
        >
          <UIcon :name="item.icon" class="w-6 h-6" />
          <span>{{ item.label }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>
```

- [ ] **Step 3: `AppBackButton.vue`**

```vue
<script setup lang="ts">
const router = useRouter();

const onBack = () => {
  if (history.state?.back) router.back();
  else navigateTo('/');
};
</script>

<template>
  <UButton
    color="gray"
    variant="ghost"
    icon="i-heroicons-arrow-left"
    aria-label="Назад"
    @click="onBack"
  />
</template>
```

- [ ] **Step 4: Smoke**

Run: `npm run dev`, открыть в мобильном режиме DevTools (≤ 1024px). Bottom-nav должен появиться.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/app/components/layout/ apps/frontend/app/components/common/AppBackButton.vue
git commit -m "feat(frontend): добавить AppTopNav, AppBottomNav, AppBackButton"
```

---

## Task 14: Layouts — `default`, `auth`, `back`

**Files:**
- Modify: `apps/frontend/app/layouts/default.vue`
- Create: `apps/frontend/app/layouts/auth.vue`
- Create: `apps/frontend/app/layouts/back.vue`

- [ ] **Step 1: Перезаписать `layouts/default.vue`**

```vue
<script setup lang="ts">
// Главный layout: top-nav (lg+), bottom-nav (mobile), main slot.
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100">
    <AppTopNav />
    <main class="flex-1 px-4 py-4 lg:px-6 lg:py-8 max-w-3xl w-full mx-auto pb-20 lg:pb-8">
      <slot />
    </main>
    <AppBottomNav />
  </div>
</template>
```

- [ ] **Step 2: Создать `layouts/auth.vue`**

```vue
<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-sm">
      <slot />
    </div>
  </div>
</template>
```

- [ ] **Step 3: Создать `layouts/back.vue`**

```vue
<template>
  <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100">
    <header class="sticky top-0 z-30 px-3 py-2 flex items-center gap-2 bg-slate-950/95 backdrop-blur border-b border-slate-900">
      <AppBackButton />
      <h1 class="text-base font-medium truncate">
        <slot name="title" />
      </h1>
      <div class="ml-auto flex items-center gap-1">
        <slot name="actions" />
      </div>
    </header>
    <main class="flex-1 pb-20 lg:pb-8">
      <slot />
    </main>
    <AppBottomNav />
  </div>
</template>
```

- [ ] **Step 4: Подключить layout `auth` к login/register**

В `pages/login.vue` и `pages/register.vue` в `definePageMeta` добавить `layout: 'auth'`. Пример для login:

```ts
definePageMeta({ middleware: 'guest', layout: 'auth' });
```

То же — в register.vue.

- [ ] **Step 5: Smoke**

Run: `npm run dev` → / (default), /login (auth, центрированно).

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/app/layouts/ apps/frontend/app/pages/login.vue apps/frontend/app/pages/register.vue
git commit -m "feat(frontend): добавить layouts default/auth/back и подключить к auth-страницам"
```

---

## Task 15: `error.vue`, `AppEmpty`, `AppErrorState`

**Files:**
- Create: `apps/frontend/app/error.vue`
- Create: `apps/frontend/app/components/common/AppEmpty.vue`
- Create: `apps/frontend/app/components/common/AppErrorState.vue`

- [ ] **Step 1: `app/error.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number; message?: string } }>();

const handleHome = () => clearError({ redirect: '/' });
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 px-4 py-8 gap-4">
    <UIcon
      :name="error.statusCode === 404 ? 'i-heroicons-magnifying-glass' : 'i-heroicons-exclamation-triangle'"
      class="w-16 h-16 text-slate-500"
    />
    <h1 class="text-2xl font-semibold">
      {{ error.statusCode === 404 ? 'Страница не найдена' : 'Что-то пошло не так' }}
    </h1>
    <p v-if="error.message" class="text-sm text-slate-400 text-center max-w-sm">{{ error.message }}</p>
    <UButton color="primary" @click="handleHome">На главную</UButton>
  </div>
</template>
```

- [ ] **Step 2: `AppEmpty.vue`**

```vue
<script setup lang="ts">
defineProps<{
  icon?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaTo?: string;
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-12 text-center">
    <UIcon v-if="icon" :name="icon" class="w-12 h-12 text-slate-600" />
    <h2 class="text-lg font-medium">{{ title }}</h2>
    <p v-if="description" class="text-sm text-slate-400 max-w-sm">{{ description }}</p>
    <UButton v-if="ctaLabel && ctaTo" :to="ctaTo" color="primary" variant="soft">{{ ctaLabel }}</UButton>
  </div>
</template>
```

- [ ] **Step 3: `AppErrorState.vue`**

```vue
<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-12 text-center">
    <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-red-500" />
    <h2 class="text-lg font-medium">{{ title }}</h2>
    <p v-if="description" class="text-sm text-slate-400 max-w-sm">{{ description }}</p>
    <UButton color="gray" variant="soft" @click="emit('retry')">Повторить</UButton>
  </div>
</template>
```

- [ ] **Step 4: Smoke** — открыть `/abc` (404) → видим заглушку.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/app/error.vue apps/frontend/app/components/common/AppEmpty.vue apps/frontend/app/components/common/AppErrorState.vue
git commit -m "feat(frontend): добавить error.vue и компоненты пустого/ошибочного состояний"
```

---

## Task 16: `AppShareButton`, `AppMarkdown`, `EventMap`

**Files:**
- Create: `apps/frontend/app/components/common/AppShareButton.vue`
- Create: `apps/frontend/app/components/common/AppMarkdown.vue`
- Create: `apps/frontend/app/components/common/EventMap.vue`

- [ ] **Step 1: `AppShareButton.vue`**

```vue
<script setup lang="ts">
import { useShare } from '~/composables/useShare';

const props = defineProps<{ title?: string; text?: string; url: string }>();
const { share } = useShare();
</script>

<template>
  <UButton
    color="gray"
    variant="ghost"
    icon="i-heroicons-share"
    aria-label="Поделиться"
    @click="share({ title: props.title, text: props.text, url: props.url })"
  />
</template>
```

- [ ] **Step 2: `AppMarkdown.vue`**

```vue
<script setup lang="ts">
import { sanitizeHtml } from '~/utils/sanitize';

const props = defineProps<{ html?: string }>();
const safe = computed(() => sanitizeHtml(props.html ?? ''));
</script>

<template>
  <div class="prose prose-invert max-w-none" v-html="safe" />
</template>
```

- [ ] **Step 3: `EventMap.vue`**

```vue
<script setup lang="ts">
import type { Venue } from '~/types/api';

const props = defineProps<{ venue?: Venue | null }>();

const yandexUrl = computed(() => {
  if (!props.venue?.address) return null;
  return `https://yandex.ru/maps/?text=${encodeURIComponent(props.venue.address)}`;
});
</script>

<template>
  <div v-if="venue" class="rounded-2xl overflow-hidden border border-slate-800">
    <iframe
      v-if="venue.mapEmbed"
      :src="venue.mapEmbed"
      class="w-full h-64"
      sandbox="allow-scripts allow-same-origin allow-popups"
      referrerpolicy="no-referrer"
      loading="lazy"
      title="Карта"
    />
    <div v-else class="p-4 flex flex-col gap-2">
      <div class="flex items-start gap-2">
        <UIcon name="i-heroicons-map-pin" class="w-5 h-5 text-slate-400 mt-0.5" />
        <div>
          <p class="font-medium">{{ venue.name }}</p>
          <p v-if="venue.address" class="text-sm text-slate-400">{{ venue.address }}</p>
        </div>
      </div>
      <UButton
        v-if="yandexUrl"
        :to="yandexUrl"
        target="_blank"
        rel="noopener noreferrer"
        color="gray"
        variant="soft"
        icon="i-heroicons-arrow-top-right-on-square"
      >
        Открыть в Яндекс.Картах
      </UButton>
    </div>
  </div>
</template>
```

- [ ] **Step 4: `npx nuxt prepare`** — без ошибок.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/app/components/common/AppShareButton.vue apps/frontend/app/components/common/AppMarkdown.vue apps/frontend/app/components/common/EventMap.vue
git commit -m "feat(frontend): добавить AppShareButton, AppMarkdown, EventMap"
```

---

## Task 17: `EventDateBadge`, `EventPriceRange`, `EventCardSkeleton`

**Files:**
- Create: `apps/frontend/app/components/event/EventDateBadge.vue`
- Create: `apps/frontend/app/components/event/EventPriceRange.vue`
- Create: `apps/frontend/app/components/event/EventCardSkeleton.vue`

- [ ] **Step 1: `EventDateBadge.vue`**

```vue
<script setup lang="ts">
import { formatDate } from '~/utils/format';

const props = defineProps<{ startsAt: string; tz?: string; compact?: boolean }>();
const text = computed(() => formatDate(props.startsAt, props.tz ?? 'Europe/Moscow'));
</script>

<template>
  <span
    class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
    :class="compact ? 'bg-slate-900/60' : 'bg-slate-800/80'"
  >
    <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5" />
    {{ text }}
  </span>
</template>
```

- [ ] **Step 2: `EventPriceRange.vue`**

```vue
<script setup lang="ts">
import type { TicketTier } from '~/types/api';
import { formatPrice } from '~/utils/format';

const props = defineProps<{ tiers?: TicketTier[]; mode?: 'from' | 'range' }>();
const range = computed(() => {
  if (!props.tiers || !props.tiers.length) return null;
  const prices = props.tiers.map((t) => t.price).sort((a, b) => a - b);
  return { min: prices[0]!, max: prices[prices.length - 1]! };
});
</script>

<template>
  <span v-if="range" class="text-sm font-medium">
    <template v-if="mode === 'range' && range.min !== range.max">
      {{ formatPrice(range.min, 'RUB') }} — {{ formatPrice(range.max, 'RUB') }}
    </template>
    <template v-else>
      от {{ formatPrice(range.min, 'RUB') }}
    </template>
  </span>
</template>
```

- [ ] **Step 3: `EventCardSkeleton.vue`**

```vue
<template>
  <div class="rounded-2xl border border-slate-800 overflow-hidden animate-pulse">
    <div class="aspect-[16/9] bg-slate-900" />
    <div class="p-4 space-y-2">
      <div class="h-4 w-1/3 bg-slate-900 rounded" />
      <div class="h-5 w-3/4 bg-slate-900 rounded" />
      <div class="h-3 w-full bg-slate-900 rounded" />
    </div>
  </div>
</template>
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/app/components/event/EventDateBadge.vue apps/frontend/app/components/event/EventPriceRange.vue apps/frontend/app/components/event/EventCardSkeleton.vue
git commit -m "feat(frontend): добавить EventDateBadge, EventPriceRange, EventCardSkeleton"
```

---

## Task 18: `FavoriteToggle`

**Files:**
- Create: `apps/frontend/app/components/favorite/FavoriteToggle.vue`

- [ ] **Step 1: `FavoriteToggle.vue`**

```vue
<script setup lang="ts">
import { useFavorites } from '~/composables/useFavorites';
import { useAuthStore } from '~/stores/auth';

const props = defineProps<{ eventId: number; size?: 'sm' | 'md' }>();
const auth = useAuthStore();
const favs = useFavorites();
const route = useRoute();

const active = computed(() => favs.isFavorite(props.eventId));
const pending = ref(false);

const toggle = async () => {
  if (!auth.isAuthenticated) {
    await navigateTo({ path: '/login', query: { redirect: route.fullPath } });
    return;
  }
  if (pending.value) return;
  pending.value = true;
  try {
    if (active.value) await favs.remove(props.eventId);
    else await favs.add(props.eventId);
  } finally {
    pending.value = false;
  }
};

onMounted(() => { if (auth.isAuthenticated) favs.ensureLoaded().catch(() => {}); });
</script>

<template>
  <button
    type="button"
    :aria-pressed="active"
    aria-label="Мне интересно"
    :class="[
      'inline-flex items-center justify-center rounded-full transition',
      size === 'sm' ? 'w-8 h-8' : 'w-10 h-10',
      active ? 'bg-red-500/20 text-red-400' : 'bg-slate-900/70 text-slate-300 hover:bg-slate-800',
    ]"
    @click.stop.prevent="toggle"
  >
    <UIcon
      :name="active ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
      class="w-5 h-5"
    />
  </button>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/app/components/favorite/FavoriteToggle.vue
git commit -m "feat(frontend): добавить FavoriteToggle с optimistic update"
```

---

## Task 19: Карточки событий — `EventCard`, `EventCardCompact`, `EventCardMyTicket`

**Files:**
- Create: `apps/frontend/app/components/event/EventCard.vue`
- Create: `apps/frontend/app/components/event/EventCardCompact.vue`
- Create: `apps/frontend/app/components/event/EventCardMyTicket.vue`

- [ ] **Step 1: `EventCard.vue`**

```vue
<script setup lang="ts">
import type { Event } from '~/types/api';

const props = defineProps<{ event: Event }>();
</script>

<template>
  <NuxtLink
    :to="`/events/${event.slug}`"
    class="block rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/40 hover:border-slate-700 transition"
  >
    <div class="relative aspect-[16/9] bg-slate-900">
      <img
        v-if="event.coverImage?.url"
        :src="event.coverImage.url"
        :alt="event.title"
        class="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div class="absolute top-2 right-2">
        <FavoriteToggle :event-id="event.id" size="sm" />
      </div>
      <div class="absolute bottom-2 left-2">
        <EventDateBadge :starts-at="event.startsAt" :tz="event.timezone" />
      </div>
    </div>
    <div class="p-4 space-y-1">
      <h3 class="text-base font-semibold line-clamp-2">{{ event.title }}</h3>
      <p v-if="event.shortDescription" class="text-sm text-slate-400 line-clamp-2">
        {{ event.shortDescription }}
      </p>
      <div class="pt-1">
        <EventPriceRange :tiers="event.tiers" mode="from" />
      </div>
    </div>
  </NuxtLink>
</template>
```

- [ ] **Step 2: `EventCardCompact.vue`**

```vue
<script setup lang="ts">
import type { Event } from '~/types/api';
import { formatDate } from '~/utils/format';

const props = defineProps<{ event: Event }>();
const dateText = computed(() => formatDate(props.event.startsAt, props.event.timezone));
</script>

<template>
  <NuxtLink
    :to="`/events/${event.slug}`"
    class="flex gap-3 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition"
  >
    <div class="w-20 h-20 rounded-lg overflow-hidden bg-slate-900 shrink-0">
      <img
        v-if="event.coverImage?.url"
        :src="event.coverImage.url"
        :alt="event.title"
        class="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
    <div class="flex-1 min-w-0 space-y-1">
      <h3 class="font-medium line-clamp-2">{{ event.title }}</h3>
      <p class="text-xs text-slate-400">{{ dateText }}</p>
      <p v-if="event.venue?.name" class="text-xs text-slate-500 truncate">
        {{ event.venue.name }}
      </p>
    </div>
  </NuxtLink>
</template>
```

- [ ] **Step 3: `EventCardMyTicket.vue`**

```vue
<script setup lang="ts">
import type { Event } from '~/types/api';
import { formatDate } from '~/utils/format';

const props = defineProps<{ event: Event; ticketId: number }>();
const dateText = computed(() => formatDate(props.event.startsAt, props.event.timezone));
</script>

<template>
  <NuxtLink
    :to="`/tickets/${ticketId}`"
    class="flex gap-3 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition"
  >
    <div class="w-24 h-24 rounded-lg overflow-hidden bg-slate-900 shrink-0">
      <img
        v-if="event.coverImage?.url"
        :src="event.coverImage.url"
        :alt="event.title"
        class="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
    <div class="flex-1 min-w-0 space-y-1">
      <h3 class="font-medium line-clamp-2">{{ event.title }}</h3>
      <p class="text-xs text-slate-400">{{ dateText }}</p>
      <p v-if="event.venue?.name" class="text-xs text-slate-500 truncate">
        {{ event.venue.name }}
      </p>
    </div>
  </NuxtLink>
</template>
```

- [ ] **Step 4: `npx nuxt prepare`** — без ошибок.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/app/components/event/EventCard.vue apps/frontend/app/components/event/EventCardCompact.vue apps/frontend/app/components/event/EventCardMyTicket.vue
git commit -m "feat(frontend): добавить карточки событий (полная, компактная, для билета)"
```

---

## Task 20: `BannerSlider`, `BannerSlide`

**Files:**
- Create: `apps/frontend/app/components/banner/BannerSlide.vue`
- Create: `apps/frontend/app/components/banner/BannerSlider.vue`

- [ ] **Step 1: `BannerSlide.vue`**

```vue
<script setup lang="ts">
import type { Banner } from '~/types/api';

const props = defineProps<{ banner: Banner }>();
</script>

<template>
  <component
    :is="banner.url ? 'a' : 'div'"
    :href="banner.url || undefined"
    :target="banner.url ? '_blank' : undefined"
    rel="noopener noreferrer"
    class="snap-start shrink-0 w-full rounded-2xl overflow-hidden bg-slate-900 relative"
    style="scroll-snap-align: start;"
  >
    <div class="aspect-[16/7]">
      <img
        v-if="banner.image?.url"
        :src="banner.image.url"
        :alt="banner.title"
        class="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
    <div class="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
      <h3 class="text-white font-semibold">{{ banner.title }}</h3>
    </div>
  </component>
</template>
```

- [ ] **Step 2: `BannerSlider.vue`**

```vue
<script setup lang="ts">
import type { Banner } from '~/types/api';

defineProps<{ banners: Banner[] }>();
</script>

<template>
  <div v-if="banners.length" class="overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-2">
    <div class="flex gap-3" style="scroll-snap-type: x mandatory;">
      <div v-for="b in banners" :key="b.id" class="w-[88%] sm:w-[70%] shrink-0">
        <BannerSlide :banner="b" />
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/app/components/banner/
git commit -m "feat(frontend): добавить BannerSlider и BannerSlide"
```

---

## Task 21: Страница `/` — главная

**Files:**
- Modify: `apps/frontend/app/pages/index.vue`

- [ ] **Step 1: Перезаписать `pages/index.vue`**

```vue
<script setup lang="ts">
import { useEvents } from '~/composables/useEvents';
import { useBanners } from '~/composables/useBanners';

const eventsApi = useEvents();
const bannersApi = useBanners();

const { data: banners, pending: bannersPending } = await useAsyncData('home-banners', () => bannersApi.list(), { default: () => [] });
const { data: events, pending: eventsPending, error: eventsError, refresh } = await useAsyncData('home-events', () => eventsApi.list({ pageSize: 20 }), { default: () => [] });
</script>

<template>
  <section class="space-y-6">
    <BannerSlider v-if="!bannersPending && banners?.length" :banners="banners" />

    <h1 class="text-xl font-semibold px-1">Ближайшие мероприятия</h1>

    <div v-if="eventsPending" class="grid gap-4 sm:grid-cols-2">
      <EventCardSkeleton v-for="i in 4" :key="i" />
    </div>
    <AppErrorState
      v-else-if="eventsError"
      title="Не удалось загрузить мероприятия"
      :description="eventsError.message"
      @retry="refresh()"
    />
    <AppEmpty
      v-else-if="!events || events.length === 0"
      icon="i-heroicons-calendar"
      title="Пока нет ближайших мероприятий"
      description="Загляните позже — мы публикуем новые анонсы регулярно."
    />
    <div v-else class="grid gap-4 sm:grid-cols-2">
      <EventCard v-for="e in events" :key="e.id" :event="e" />
    </div>
  </section>
</template>
```

- [ ] **Step 2: Smoke**

Run: `npm run dev`. Открыть `/`. Если в БД нет опубликованных событий — увидеть `AppEmpty`. Если есть — карточки. Никаких ошибок в консоли.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/app/pages/index.vue
git commit -m "feat(frontend): главная страница с баннерами и лентой событий"
```

---

## Task 22: Страница `/search`

**Files:**
- Create: `apps/frontend/app/pages/search.vue`

- [ ] **Step 1: `pages/search.vue`**

```vue
<script setup lang="ts">
import { useEvents } from '~/composables/useEvents';
import { refDebounced } from '@vueuse/core';

const route = useRoute();
const router = useRouter();
const eventsApi = useEvents();

const q = ref<string>((route.query.q as string) || '');
const debouncedQ = refDebounced(q, 300);

watch(debouncedQ, (val) => {
  router.replace({ query: val ? { q: val } : {} });
});

const { data: results, pending } = await useAsyncData(
  'search-events',
  () => debouncedQ.value.trim().length >= 2
    ? eventsApi.search(debouncedQ.value.trim())
    : Promise.resolve([]),
  { watch: [debouncedQ], default: () => [] },
);
</script>

<template>
  <section class="space-y-4">
    <UInput
      v-model="q"
      icon="i-heroicons-magnifying-glass"
      size="lg"
      placeholder="Поиск мероприятия"
      autofocus
      :ui="{ base: 'bg-slate-900 border border-slate-800' }"
    />

    <div v-if="pending" class="space-y-2">
      <EventCardSkeleton v-for="i in 3" :key="i" />
    </div>
    <AppEmpty
      v-else-if="!q || q.trim().length < 2"
      icon="i-heroicons-magnifying-glass"
      title="Введите запрос"
      description="Минимум 2 символа."
    />
    <AppEmpty
      v-else-if="!results?.length"
      icon="i-heroicons-magnifying-glass"
      title="Ничего не найдено"
      :description="`По запросу «${q}» нет мероприятий.`"
    />
    <div v-else class="space-y-2">
      <EventCardCompact v-for="e in results" :key="e.id" :event="e" />
    </div>
  </section>
</template>
```

- [ ] **Step 2: Smoke** — `/search`, ввести 2+ символа, увидеть результаты или AppEmpty.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/app/pages/search.vue
git commit -m "feat(frontend): страница поиска с debounce и компактными карточками"
```

---

## Task 23: Детальные блоки события — `EventHero`, `EventOrganizerBlock`, `EventAgenda`, `EventSpeakers`, `EventGallery`

**Files:**
- Create: `apps/frontend/app/components/event/EventHero.vue`
- Create: `apps/frontend/app/components/event/EventOrganizerBlock.vue`
- Create: `apps/frontend/app/components/event/EventAgenda.vue`
- Create: `apps/frontend/app/components/event/EventSpeakers.vue`
- Create: `apps/frontend/app/components/event/EventGallery.vue`
- Create: `apps/frontend/app/components/speaker/SpeakerCard.vue`
- Create: `apps/frontend/app/components/speaker/SpeakerCardCompact.vue`

- [ ] **Step 1: `EventHero.vue`**

```vue
<script setup lang="ts">
import type { Event } from '~/types/api';

defineProps<{ event: Event }>();
const route = useRoute();
const fullUrl = computed(() => {
  const config = useRuntimeConfig();
  return `${config.public.siteUrl || ''}${route.fullPath}`;
});
</script>

<template>
  <div class="relative aspect-[16/9] bg-slate-900 rounded-b-3xl overflow-hidden">
    <img
      v-if="event.coverImage?.url"
      :src="event.coverImage.url"
      :alt="event.title"
      class="absolute inset-0 w-full h-full object-cover"
    />
    <div class="absolute top-3 left-3"><AppBackButton /></div>
    <div class="absolute top-3 right-3 flex items-center gap-2">
      <FavoriteToggle :event-id="event.id" />
      <AppShareButton :title="event.title" :url="fullUrl" />
    </div>
  </div>
</template>
```

- [ ] **Step 2: `EventOrganizerBlock.vue`**

```vue
<script setup lang="ts">
import type { Organizer } from '~/types/api';

defineProps<{ organizer: Organizer }>();
</script>

<template>
  <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60">
    <div class="w-12 h-12 rounded-full overflow-hidden bg-slate-800 shrink-0">
      <img
        v-if="organizer.logo?.url"
        :src="organizer.logo.url"
        :alt="organizer.name"
        class="w-full h-full object-cover"
      />
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-xs text-slate-400">Организатор</p>
      <p class="font-medium truncate">{{ organizer.name }}</p>
    </div>
  </div>
</template>
```

- [ ] **Step 3: `EventAgenda.vue`**

```vue
<script setup lang="ts">
import type { AgendaItem } from '~/types/api';
import { formatDate } from '~/utils/format';

defineProps<{ items: AgendaItem[]; tz?: string }>();
</script>

<template>
  <ol v-if="items.length" class="space-y-3">
    <li v-for="item in items" :key="item.id" class="flex gap-3">
      <div class="w-20 shrink-0 text-sm text-slate-400 font-mono">
        {{ formatDate(item.startsAt, tz ?? 'Europe/Moscow').split(', ')[1] }}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-medium">{{ item.title }}</p>
        <p v-if="item.description" class="text-sm text-slate-400">{{ item.description }}</p>
        <p v-if="item.speakers?.length" class="text-xs text-slate-500 mt-1">
          {{ item.speakers.map((s) => s.fullName).join(', ') }}
        </p>
      </div>
    </li>
  </ol>
</template>
```

- [ ] **Step 4: `EventSpeakers.vue`**

```vue
<script setup lang="ts">
import type { Speaker } from '~/types/api';

defineProps<{ speakers: Speaker[] }>();
</script>

<template>
  <div v-if="speakers.length" class="overflow-x-auto -mx-4 px-4">
    <div class="flex gap-3">
      <SpeakerCard v-for="s in speakers" :key="s.id" :speaker="s" class="w-32 shrink-0" />
    </div>
  </div>
</template>
```

- [ ] **Step 5: `EventGallery.vue`**

```vue
<script setup lang="ts">
import type { MediaFile } from '~/types/api';

defineProps<{ images: MediaFile[] }>();
</script>

<template>
  <div v-if="images.length" class="overflow-x-auto -mx-4 px-4">
    <div class="flex gap-2">
      <a
        v-for="img in images"
        :key="img.id"
        :href="img.url"
        target="_blank"
        rel="noopener noreferrer"
        class="w-40 h-28 rounded-lg overflow-hidden bg-slate-900 shrink-0"
      >
        <img :src="img.url" alt="" class="w-full h-full object-cover" loading="lazy" />
      </a>
    </div>
  </div>
</template>
```

- [ ] **Step 6: `SpeakerCard.vue`**

```vue
<script setup lang="ts">
import type { Speaker } from '~/types/api';

defineProps<{ speaker: Speaker }>();
</script>

<template>
  <div class="space-y-2">
    <div class="aspect-square rounded-xl overflow-hidden bg-slate-900">
      <img
        v-if="speaker.photo?.url"
        :src="speaker.photo.url"
        :alt="speaker.fullName"
        class="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
    <p class="text-sm font-medium line-clamp-2">{{ speaker.fullName }}</p>
  </div>
</template>
```

- [ ] **Step 7: `SpeakerCardCompact.vue`**

```vue
<script setup lang="ts">
import type { Speaker } from '~/types/api';

defineProps<{ speaker: Speaker }>();
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="w-8 h-8 rounded-full overflow-hidden bg-slate-900 shrink-0">
      <img
        v-if="speaker.photo?.url"
        :src="speaker.photo.url"
        :alt="speaker.fullName"
        class="w-full h-full object-cover"
      />
    </div>
    <span class="text-sm">{{ speaker.fullName }}</span>
  </div>
</template>
```

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/app/components/event/EventHero.vue apps/frontend/app/components/event/EventOrganizerBlock.vue apps/frontend/app/components/event/EventAgenda.vue apps/frontend/app/components/event/EventSpeakers.vue apps/frontend/app/components/event/EventGallery.vue apps/frontend/app/components/speaker/
git commit -m "feat(frontend): добавить детальные блоки события (hero, организатор, программа, спикеры, галерея)"
```

---

## Task 24: Страница `/events/[slug]`

**Files:**
- Create: `apps/frontend/app/pages/events/[slug]/index.vue`

- [ ] **Step 1: `pages/events/[slug]/index.vue`**

```vue
<script setup lang="ts">
import { useEvents } from '~/composables/useEvents';
import { formatDateRange } from '~/utils/format';

definePageMeta({ layout: 'back' });

const route = useRoute();
const slug = computed(() => route.params.slug as string);
const eventsApi = useEvents();

const { data: event, error } = await useAsyncData(
  () => `event-${slug.value}`,
  () => eventsApi.findBySlug(slug.value),
);

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Мероприятие не найдено', fatal: true });
}

const dateText = computed(() => event.value
  ? formatDateRange(event.value.startsAt, event.value.endsAt, event.value.timezone)
  : '',
);

const onBuy = async () => {
  await navigateTo(`/events/${slug.value}/checkout`);
};
</script>

<template>
  <div v-if="event" class="pb-24">
    <EventHero :event="event" />

    <div class="px-4 mt-4 space-y-6">
      <h1 class="text-2xl font-bold">{{ event.title }}</h1>

      <EventOrganizerBlock v-if="event.organizer" :organizer="event.organizer" />

      <div class="space-y-1">
        <p class="text-sm text-slate-400">Когда</p>
        <p class="font-medium">{{ dateText }}</p>
      </div>

      <div v-if="event.venue" class="space-y-1">
        <p class="text-sm text-slate-400">Где</p>
        <p class="font-medium">{{ event.venue.name }}</p>
        <p v-if="event.venue.address" class="text-sm text-slate-400">{{ event.venue.address }}</p>
      </div>

      <section v-if="event.description" class="space-y-2">
        <h2 class="text-lg font-semibold">О мероприятии</h2>
        <AppMarkdown :html="event.description" />
      </section>

      <section v-if="event.agenda?.length" class="space-y-2">
        <h2 class="text-lg font-semibold">Программа</h2>
        <EventAgenda :items="event.agenda" :tz="event.timezone" />
      </section>

      <section v-if="event.venue" class="space-y-2">
        <h2 class="text-lg font-semibold">Место проведения</h2>
        <EventMap :venue="event.venue" />
      </section>

      <section v-if="event.speakers?.length" class="space-y-2">
        <h2 class="text-lg font-semibold">Спикеры</h2>
        <EventSpeakers :speakers="event.speakers" />
      </section>

      <section v-if="event.pastGallery?.length" class="space-y-2">
        <h2 class="text-lg font-semibold">С прошлого мероприятия</h2>
        <EventGallery :images="event.pastGallery" />
      </section>
    </div>

    <div
      class="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 border-t border-slate-800 bg-slate-950/95 backdrop-blur lg:hidden flex items-center justify-between gap-3"
      :style="{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }"
    >
      <EventPriceRange :tiers="event.tiers" mode="range" />
      <UButton size="lg" color="primary" :disabled="!event.tiers?.length" @click="onBuy">
        Купить
      </UButton>
    </div>

    <div class="hidden lg:flex items-center justify-between mt-6 px-4">
      <EventPriceRange :tiers="event.tiers" mode="range" />
      <UButton size="lg" color="primary" :disabled="!event.tiers?.length" @click="onBuy">
        Купить
      </UButton>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Smoke**

Run: `npm run dev`. Создать опубликованный event в Strapi Admin (с `tier`-ами). Открыть `/events/<slug>`. Все блоки должны рендериться. Кнопка «Купить» — переход на `/events/<slug>/checkout` (потом 401-редирект на `/login` пока он не реализован — нормально).

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/app/pages/events/
git commit -m "feat(frontend): детальная страница события со всеми блоками из ТЗ"
```

---

## Task 25: `TierAccordion`, `TierStepper`, `CartSummary`

**Files:**
- Create: `apps/frontend/app/components/ticket-tier/TierStepper.vue`
- Create: `apps/frontend/app/components/ticket-tier/TierAccordion.vue`
- Create: `apps/frontend/app/components/ticket-tier/CartSummary.vue`

- [ ] **Step 1: `TierStepper.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{ modelValue: number; max?: number }>();
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();

const dec = () => emit('update:modelValue', Math.max(0, props.modelValue - 1));
const inc = () => emit('update:modelValue', props.max != null ? Math.min(props.max, props.modelValue + 1) : props.modelValue + 1);
</script>

<template>
  <div class="inline-flex items-center gap-1 rounded-full bg-slate-900 border border-slate-800">
    <button
      type="button"
      class="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 disabled:opacity-30"
      :disabled="modelValue <= 0"
      @click="dec"
    >−</button>
    <span class="w-6 text-center text-sm tabular-nums">{{ modelValue }}</span>
    <button
      type="button"
      class="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 disabled:opacity-30"
      :disabled="max != null && modelValue >= max"
      @click="inc"
    >+</button>
  </div>
</template>
```

- [ ] **Step 2: `TierAccordion.vue`**

```vue
<script setup lang="ts">
import type { TicketTier } from '~/types/api';
import { formatPrice } from '~/utils/format';

const props = defineProps<{ tier: TicketTier; qty: number }>();
const emit = defineEmits<{ 'update:qty': [value: number] }>();

const expanded = ref(false);
</script>

<template>
  <div class="rounded-xl border border-slate-800 bg-slate-900/40">
    <div class="flex items-center justify-between p-4 gap-3">
      <button
        type="button"
        class="flex-1 text-left flex items-center gap-2"
        @click="expanded = !expanded"
      >
        <UIcon
          :name="expanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          class="w-4 h-4 text-slate-400"
        />
        <div>
          <p class="font-medium">{{ tier.name }}</p>
          <p v-if="tier.description" class="text-xs text-slate-400 line-clamp-1">{{ tier.description }}</p>
        </div>
      </button>
      <span class="font-semibold tabular-nums">{{ formatPrice(tier.price, tier.currency) }}</span>
      <TierStepper :model-value="qty" @update:model-value="(v) => emit('update:qty', v)" />
    </div>
    <div v-if="expanded && tier.includes" class="px-4 pb-4">
      <AppMarkdown :html="tier.includes" />
    </div>
  </div>
</template>
```

- [ ] **Step 3: `CartSummary.vue`**

```vue
<script setup lang="ts">
import { useCartStore } from '~/stores/cart';
import { formatPrice } from '~/utils/format';

const cart = useCartStore();
const emit = defineEmits<{ checkout: [] }>();
</script>

<template>
  <div
    class="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 border-t border-slate-800 bg-slate-950/95 backdrop-blur lg:static lg:border-t-0 lg:bg-transparent lg:p-0"
    :style="{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }"
  >
    <div class="space-y-1">
      <div class="flex items-center justify-between text-sm text-slate-400">
        <span>Подытог</span>
        <span class="tabular-nums">{{ formatPrice(cart.subtotal, 'RUB') }}</span>
      </div>
      <div v-if="cart.discount > 0" class="flex items-center justify-between text-sm text-emerald-400">
        <span>Скидка</span>
        <span class="tabular-nums">−{{ formatPrice(cart.discount, 'RUB') }}</span>
      </div>
      <div class="flex items-center justify-between font-semibold pt-1">
        <span>Итого</span>
        <span class="tabular-nums">{{ formatPrice(cart.total, 'RUB') }}</span>
      </div>
    </div>
    <UButton
      block
      size="lg"
      color="primary"
      class="mt-3"
      :disabled="cart.isEmpty"
      @click="emit('checkout')"
    >
      Оформить
    </UButton>
  </div>
</template>
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/app/components/ticket-tier/
git commit -m "feat(frontend): добавить TierAccordion, TierStepper, CartSummary"
```

---

## Task 26: Страница `/events/[slug]/checkout` — выбор билетов

**Files:**
- Create: `apps/frontend/app/pages/events/[slug]/checkout/index.vue`
- Create: `apps/frontend/app/components/order/PromoCodeInput.vue`

- [ ] **Step 1: `PromoCodeInput.vue`**

```vue
<script setup lang="ts">
import { useCartStore } from '~/stores/cart';
import { useCart } from '~/composables/useCart';
import { formatPrice } from '~/utils/format';

const props = defineProps<{ eventId: number }>();
const cart = useCartStore();
const { applyPromo } = useCart();
const local = ref(cart.promoCode || '');
const pending = ref(false);

const apply = async () => {
  cart.setPromo(local.value);
  if (!cart.promoCode) return;
  pending.value = true;
  try { await applyPromo(props.eventId); }
  finally { pending.value = false; }
};

const reasonText = computed(() => {
  switch (cart.promoApplied?.reason) {
    case 'expired': return 'Промокод истёк';
    case 'limit': return 'Промокод исчерпан';
    case 'not-eligible': return 'Промокод не действует на это мероприятие';
    case 'invalid': return 'Промокод не найден';
    default: return null;
  }
});
</script>

<template>
  <div class="space-y-2">
    <div class="flex gap-2">
      <UInput v-model="local" placeholder="Промокод" class="flex-1" :disabled="pending" />
      <UButton color="gray" variant="soft" :loading="pending" @click="apply">Применить</UButton>
    </div>
    <p v-if="cart.promoApplied?.applied" class="text-sm text-emerald-400">
      Применён: −{{ formatPrice(cart.promoApplied.discount, 'RUB') }}
    </p>
    <p v-else-if="reasonText" class="text-sm text-red-400">{{ reasonText }}</p>
  </div>
</template>
```

- [ ] **Step 2: `pages/events/[slug]/checkout/index.vue`**

```vue
<script setup lang="ts">
import { useEvents } from '~/composables/useEvents';
import { useCartStore } from '~/stores/cart';

definePageMeta({ layout: 'back' });

const route = useRoute();
const slug = computed(() => route.params.slug as string);
const cart = useCartStore();
const eventsApi = useEvents();

const { data: event, error } = await useAsyncData(
  () => `event-checkout-${slug.value}`,
  () => eventsApi.findBySlug(slug.value),
);

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Мероприятие не найдено', fatal: true });
}

const showSwitchModal = ref(false);

onMounted(() => {
  cart.hydrate();
  if (cart.eventSlug && cart.eventSlug !== slug.value && !cart.isEmpty) {
    showSwitchModal.value = true;
  }
});

const switchEvent = () => {
  cart.reset();
  showSwitchModal.value = false;
};
const goBack = () => navigateTo(`/events/${cart.eventSlug}/checkout`);

const sortedTiers = computed(() =>
  [...(event.value?.tiers ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
);

const onQty = (tierId: number, qty: number) => {
  if (!event.value) return;
  const tier = sortedTiers.value.find((t) => t.id === tierId);
  if (!tier) return;
  if (cart.byTier(tierId)) cart.setQty(tierId, qty);
  else if (qty > 0) cart.add(tier, qty, slug.value);
};

const proceed = async () => {
  await navigateTo(`/events/${slug.value}/checkout/pay`);
};
</script>

<template>
  <div v-if="event" class="px-4 py-4 space-y-4 pb-44 lg:pb-8">
    <h1 class="text-xl font-semibold">{{ event.title }}</h1>

    <div class="space-y-3">
      <TierAccordion
        v-for="t in sortedTiers"
        :key="t.id"
        :tier="t"
        :qty="cart.byTier(t.id)?.qty ?? 0"
        @update:qty="(v) => onQty(t.id, v)"
      />
    </div>

    <PromoCodeInput :event-id="event.id" />

    <CartSummary @checkout="proceed" />

    <UModal v-model="showSwitchModal" prevent-close>
      <UCard>
        <template #header>
          <p class="font-semibold">Переключить мероприятие?</p>
        </template>
        <p class="text-sm">
          У вас есть выбор билетов на другое мероприятие.
          Очистить корзину и продолжить?
        </p>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="ghost" @click="goBack">Назад</UButton>
            <UButton color="primary" @click="switchEvent">Очистить</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
```

- [ ] **Step 3: Smoke** — выбрать tier'ы, увидеть CartSummary с правильным total, ввести промокод и нажать «Применить» (если промокод существует — увидеть скидку).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/app/pages/events/ apps/frontend/app/components/order/PromoCodeInput.vue
git commit -m "feat(frontend): экран выбора билетов с корзиной и промокодом"
```

---

## Task 27: Order-формы — `AttendeeForm`, `PaymentMethodPicker`, `PersonalDataConsent`, `OrderSummary`

**Files:**
- Create: `apps/frontend/app/components/order/AttendeeForm.vue`
- Create: `apps/frontend/app/components/order/PaymentMethodPicker.vue`
- Create: `apps/frontend/app/components/order/PersonalDataConsent.vue`
- Create: `apps/frontend/app/components/order/OrderSummary.vue`

- [ ] **Step 1: `AttendeeForm.vue`**

```vue
<script setup lang="ts">
import { z } from 'zod';
import type { Attendee } from '~/types/api';

const props = defineProps<{ modelValue: Attendee; title: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: Attendee]; 'update:valid': [value: boolean] }>();

const schema = z.object({
  fullName: z.string().min(2, 'Введите ФИО'),
  email: z.string().email('Неверный email').optional().or(z.literal('')),
  phone: z.string().min(0).optional().or(z.literal('')),
});

const local = reactive<Attendee>({ ...props.modelValue });

watch(local, (v) => {
  emit('update:modelValue', { ...v });
  const result = schema.safeParse(v);
  emit('update:valid', result.success);
}, { deep: true, immediate: true });
</script>

<template>
  <UCard>
    <template #header>
      <p class="font-semibold">{{ title }}</p>
    </template>
    <UForm :schema="schema" :state="local" class="space-y-3">
      <UFormGroup label="ФИО" name="fullName" required>
        <UInput v-model="local.fullName" autocomplete="name" />
      </UFormGroup>
      <UFormGroup label="Email" name="email">
        <UInput v-model="local.email" type="email" autocomplete="email" />
      </UFormGroup>
      <UFormGroup label="Телефон" name="phone">
        <UInput v-model="local.phone" type="tel" autocomplete="tel" />
      </UFormGroup>
    </UForm>
  </UCard>
</template>
```

- [ ] **Step 2: `PaymentMethodPicker.vue`**

```vue
<script setup lang="ts">
import type { PaymentMethod } from '~/types/api';

const props = defineProps<{ modelValue: PaymentMethod }>();
const emit = defineEmits<{ 'update:modelValue': [value: PaymentMethod] }>();

const options = [
  { value: 'card' as PaymentMethod, label: 'Картой' },
  { value: 'sbp' as PaymentMethod, label: 'СБП' },
  { value: 'invoice' as PaymentMethod, label: 'По счёту' },
];
</script>

<template>
  <fieldset class="space-y-2">
    <legend class="font-semibold mb-2">Способ оплаты</legend>
    <label
      v-for="o in options"
      :key="o.value"
      class="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700"
      :class="{ 'border-indigo-500 bg-indigo-500/5': modelValue === o.value }"
    >
      <input
        type="radio"
        :checked="modelValue === o.value"
        :value="o.value"
        @change="emit('update:modelValue', o.value)"
      />
      <span>{{ o.label }}</span>
    </label>
  </fieldset>
</template>
```

- [ ] **Step 3: `PersonalDataConsent.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<template>
  <label class="flex items-start gap-2 text-sm">
    <UCheckbox
      :model-value="modelValue"
      @update:model-value="(v) => emit('update:modelValue', !!v)"
    />
    <span>
      Согласен на обработку персональных данных в соответствии с
      <a href="#" class="underline">политикой конфиденциальности</a>.
    </span>
  </label>
</template>
```

- [ ] **Step 4: `OrderSummary.vue`**

```vue
<script setup lang="ts">
import type { Order } from '~/types/api';
import { formatPrice } from '~/utils/format';

defineProps<{ order: Order }>();
</script>

<template>
  <div class="rounded-xl border border-slate-800 p-4 space-y-2">
    <p class="text-sm text-slate-400">Заказ № {{ order.number }}</p>
    <ul v-if="order.items?.length" class="space-y-1 text-sm">
      <li v-for="i in order.items" :key="i.id" class="flex justify-between">
        <span>{{ i.tier?.name }} × {{ i.quantity }}</span>
        <span class="tabular-nums">{{ formatPrice(i.unitPrice * i.quantity, 'RUB') }}</span>
      </li>
    </ul>
    <div class="flex justify-between text-sm text-slate-400 border-t border-slate-800 pt-2">
      <span>Подытог</span>
      <span class="tabular-nums">{{ formatPrice(order.subtotal, 'RUB') }}</span>
    </div>
    <div v-if="order.discount > 0" class="flex justify-between text-sm text-emerald-400">
      <span>Скидка</span>
      <span class="tabular-nums">−{{ formatPrice(order.discount, 'RUB') }}</span>
    </div>
    <div class="flex justify-between font-semibold">
      <span>Итого</span>
      <span class="tabular-nums">{{ formatPrice(order.total, 'RUB') }}</span>
    </div>
  </div>
</template>
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/app/components/order/AttendeeForm.vue apps/frontend/app/components/order/PaymentMethodPicker.vue apps/frontend/app/components/order/PersonalDataConsent.vue apps/frontend/app/components/order/OrderSummary.vue
git commit -m "feat(frontend): order-компоненты (AttendeeForm, PaymentMethodPicker, PersonalDataConsent, OrderSummary)"
```

---

## Task 28: Страница `/events/[slug]/checkout/pay` — checkout

**Files:**
- Create: `apps/frontend/app/pages/events/[slug]/checkout/pay.vue`

- [ ] **Step 1: `pages/events/[slug]/checkout/pay.vue`**

```vue
<script setup lang="ts">
import { useEvents } from '~/composables/useEvents';
import { useOrder } from '~/composables/useOrder';
import { useCartStore } from '~/stores/cart';
import { useAuthStore } from '~/stores/auth';
import type { Attendee, PaymentMethod } from '~/types/api';
import { formatPrice } from '~/utils/format';
import { parseStrapiError } from '~/utils/api';

definePageMeta({ middleware: 'auth', layout: 'back' });

const route = useRoute();
const slug = computed(() => route.params.slug as string);
const cart = useCartStore();
const auth = useAuthStore();
const eventsApi = useEvents();
const orderApi = useOrder();
const toast = useToast();

const { data: event } = await useAsyncData(
  () => `event-pay-${slug.value}`,
  () => eventsApi.findBySlug(slug.value),
);

onMounted(() => {
  cart.hydrate();
  if (cart.isEmpty || cart.eventSlug !== slug.value) {
    navigateTo(`/events/${slug.value}/checkout`);
  }
});

// Раскручиваем корзину в плоский список билетов.
const flatTickets = computed(() => {
  const arr: Array<{ tierId: number; tierName: string; index: number }> = [];
  for (const item of cart.items) {
    for (let i = 0; i < item.qty; i++) {
      arr.push({ tierId: item.tierId, tierName: item.snapshot.name, index: arr.length });
    }
  }
  return arr;
});

const attendees = ref<Attendee[]>([]);
const valid = ref<boolean[]>([]);
watch(flatTickets, (tickets) => {
  attendees.value = tickets.map((_, i) => attendees.value[i] ?? {
    fullName: i === 0 ? (auth.user?.username || '') : '',
    email: i === 0 ? (auth.user?.email || '') : '',
    phone: '',
  });
  valid.value = tickets.map(() => false);
}, { immediate: true });

const paymentMethod = ref<PaymentMethod>('card');
const consent = ref(false);
const submitting = ref(false);

const allValid = computed(() =>
  valid.value.length > 0 && valid.value.every(Boolean) && consent.value,
);

const onSubmit = async () => {
  if (!event.value || !allValid.value) return;
  submitting.value = true;
  try {
    const order = await orderApi.create({
      eventId: event.value.id,
      items: cart.items.map((i) => ({ tierId: i.tierId, quantity: i.qty })),
      promoCode: cart.promoCode || undefined,
      paymentMethod: paymentMethod.value,
      personalDataConsent: true,
      attendees: attendees.value,
    });
    cart.reset();
    await navigateTo(`/orders/${order.id}/pay`);
  } catch (err) {
    const parsed = parseStrapiError(err);
    toast.add({ color: 'red', title: 'Ошибка оформления', description: parsed.message });
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div v-if="event" class="px-4 py-4 space-y-4 pb-32 lg:pb-8">
    <header class="flex items-start gap-3">
      <div class="w-16 h-16 rounded-lg overflow-hidden bg-slate-900 shrink-0">
        <img v-if="event.coverImage?.url" :src="event.coverImage.url" :alt="event.title" class="w-full h-full object-cover" />
      </div>
      <div class="min-w-0">
        <h1 class="font-semibold line-clamp-2">{{ event.title }}</h1>
        <p class="text-xs text-slate-400">{{ event.venue?.name }}</p>
      </div>
    </header>

    <div class="space-y-3">
      <AttendeeForm
        v-for="(t, i) in flatTickets"
        :key="i"
        :title="`Билет ${i + 1} — ${t.tierName}`"
        :model-value="attendees[i]"
        @update:model-value="(v) => attendees[i] = v"
        @update:valid="(v) => valid[i] = v"
      />
    </div>

    <PaymentMethodPicker v-model="paymentMethod" />
    <PersonalDataConsent v-model="consent" />

    <div class="flex items-center justify-between border-t border-slate-800 pt-3">
      <span class="text-sm text-slate-400">Итого</span>
      <span class="font-semibold tabular-nums">{{ formatPrice(cart.total, 'RUB') }}</span>
    </div>

    <UButton
      block
      size="lg"
      color="primary"
      :disabled="!allValid"
      :loading="submitting"
      @click="onSubmit"
    >
      Оплатить
    </UButton>
  </div>
</template>
```

- [ ] **Step 2: Smoke** — заполнить анкеты, выбрать оплату, отметить consent → нажать «Оплатить» → редирект на `/orders/[id]/pay` (404 пока не реализован — ок).

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/app/pages/events/[slug]/checkout/pay.vue
git commit -m "feat(frontend): checkout-страница с анкетами, способом оплаты и согласием на ПД"
```

---

## Task 29: Страница `/orders/[id]/pay` — Mock-pay

**Files:**
- Create: `apps/frontend/app/pages/orders/[id]/pay.vue`

- [ ] **Step 1: `pages/orders/[id]/pay.vue`**

```vue
<script setup lang="ts">
import { useOrder } from '~/composables/useOrder';

definePageMeta({ middleware: 'auth', layout: 'back' });

const config = useRuntimeConfig();
if (config.public.appEnv === 'production') {
  throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true });
}

const route = useRoute();
const id = Number(route.params.id);
const orderApi = useOrder();
const toast = useToast();

const { data: order, error, refresh } = await useAsyncData(
  () => `order-pay-${id}`,
  () => orderApi.findOneMine(id),
);

watch(order, (o) => {
  if (o?.paymentStatus === 'paid') {
    navigateTo('/tickets');
  }
}, { immediate: true });

const paying = ref(false);

const onPay = async () => {
  paying.value = true;
  try {
    await orderApi.markPaid(id);
    toast.add({ color: 'green', title: 'Оплата прошла', description: 'Билеты выпущены' });
    await navigateTo('/tickets');
  } catch (err) {
    toast.add({ color: 'red', title: 'Не удалось оплатить' });
  } finally {
    paying.value = false;
  }
};

const onCancel = () => navigateTo('/');
</script>

<template>
  <div class="px-4 py-4 space-y-4">
    <h1 class="text-xl font-semibold">Тестовая оплата</h1>
    <p class="text-sm text-slate-400">
      Платёжный шлюз ещё не подключён. Используйте кнопку ниже,
      чтобы симулировать успешную оплату и получить билеты.
    </p>

    <AppErrorState
      v-if="error"
      title="Заказ не найден"
      :description="error.message"
      @retry="refresh()"
    />
    <OrderSummary v-else-if="order" :order="order" />

    <div v-if="order && order.paymentStatus === 'pending'" class="space-y-2">
      <UButton block size="lg" color="primary" :loading="paying" @click="onPay">
        Симулировать оплату
      </UButton>
      <UButton block color="gray" variant="soft" :disabled="paying" @click="onCancel">
        Отменить
      </UButton>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Smoke** — оформить заказ → mark-paid → редирект на `/tickets`.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/app/pages/orders/
git commit -m "feat(frontend): mock-pay страница (dev only)"
```

---

## Task 30: `TicketQr`, `TicketDetails`, `TicketAttendeeList`

**Files:**
- Create: `apps/frontend/app/components/ticket/TicketQr.vue`
- Create: `apps/frontend/app/components/ticket/TicketDetails.vue`
- Create: `apps/frontend/app/components/ticket/TicketAttendeeList.vue`

- [ ] **Step 1: `TicketQr.vue`**

```vue
<script setup lang="ts">
import QRCode from 'qrcode';

const props = defineProps<{ payload: string; size?: number }>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

const render = async () => {
  if (!canvasRef.value || !props.payload) return;
  await QRCode.toCanvas(canvasRef.value, props.payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: props.size ?? 280,
    color: { dark: '#0f172a', light: '#ffffff' },
  });
};

onMounted(render);
watch(() => props.payload, render);

defineExpose({
  toDataUrl: () => canvasRef.value?.toDataURL('image/png'),
});
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <div class="bg-white p-3 rounded-2xl">
      <canvas ref="canvasRef" />
    </div>
  </div>
</template>
```

- [ ] **Step 2: `TicketDetails.vue`**

```vue
<script setup lang="ts">
import type { Ticket } from '~/types/api';
import { formatDateRange, formatPrice } from '~/utils/format';

const props = defineProps<{ ticket: Ticket }>();
const dateText = computed(() => props.ticket.event
  ? formatDateRange(props.ticket.event.startsAt, props.ticket.event.endsAt, props.ticket.event.timezone)
  : '',
);
</script>

<template>
  <div class="space-y-3">
    <h1 class="text-xl font-semibold">{{ ticket.event?.title }}</h1>
    <p class="text-sm text-slate-400">{{ dateText }}</p>
    <p v-if="ticket.event?.venue?.name" class="text-sm text-slate-400">
      {{ ticket.event.venue.name }}<span v-if="ticket.event.venue.address">, {{ ticket.event.venue.address }}</span>
    </p>
    <div class="flex items-center justify-between border-t border-slate-800 pt-3">
      <span class="font-medium">{{ ticket.tier?.name }}</span>
      <span v-if="ticket.tier?.price != null" class="tabular-nums">
        {{ formatPrice(ticket.tier.price, ticket.tier.currency || 'RUB') }}
      </span>
    </div>
    <div class="text-xs text-slate-400 space-y-0.5">
      <p>Заказ № {{ ticket.order?.number }}</p>
      <p>Билет № {{ ticket.number }}</p>
      <p>Посетитель: {{ ticket.attendee?.fullName }}</p>
    </div>
  </div>
</template>
```

- [ ] **Step 3: `TicketAttendeeList.vue`**

```vue
<script setup lang="ts">
import type { Order, Ticket } from '~/types/api';

defineProps<{ tickets: Ticket[] }>();
const open = ref<number | null>(null);
</script>

<template>
  <div class="space-y-2">
    <h2 class="font-semibold">Посетители заказа</h2>
    <div v-for="t in tickets" :key="t.id" class="rounded-lg border border-slate-800">
      <button
        type="button"
        class="w-full flex items-center justify-between px-3 py-2"
        @click="open = open === t.id ? null : t.id"
      >
        <span class="text-sm">{{ t.attendee?.fullName }}</span>
        <UIcon :name="open === t.id ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-4 h-4" />
      </button>
      <div v-if="open === t.id && t.qrPayload" class="px-3 pb-3">
        <TicketQr :payload="t.qrPayload" :size="240" />
        <p class="text-xs text-slate-400 text-center mt-1">№ {{ t.number }}</p>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/app/components/ticket/
git commit -m "feat(frontend): добавить TicketQr (qrcode + canvas), TicketDetails, TicketAttendeeList"
```

---

## Task 31: Страницы `/tickets` и `/tickets/[id]`

**Files:**
- Create: `apps/frontend/app/pages/tickets/index.vue`
- Create: `apps/frontend/app/pages/tickets/[id].vue`

- [ ] **Step 1: `pages/tickets/index.vue`**

```vue
<script setup lang="ts">
import { useTickets } from '~/composables/useTickets';

definePageMeta({ middleware: 'auth' });

const ticketsApi = useTickets();
const { data: tickets, pending } = await useAsyncData('my-tickets', () => ticketsApi.listMine(), { default: () => [] });

const now = Date.now();
const upcoming = computed(() => (tickets.value ?? []).filter((t) =>
  t.event?.startsAt && new Date(t.event.startsAt).getTime() >= now,
));
const past = computed(() => (tickets.value ?? []).filter((t) =>
  t.event?.startsAt && new Date(t.event.startsAt).getTime() < now,
));
</script>

<template>
  <section class="space-y-4">
    <h1 class="text-xl font-semibold">Мои билеты</h1>
    <div v-if="pending" class="space-y-2">
      <EventCardSkeleton v-for="i in 2" :key="i" />
    </div>
    <AppEmpty
      v-else-if="!tickets?.length"
      icon="i-heroicons-ticket"
      title="Билетов пока нет"
      description="Купите билет — и он появится здесь."
      cta-label="К мероприятиям"
      cta-to="/"
    />
    <template v-else>
      <div v-if="upcoming.length" class="space-y-2">
        <h2 class="text-sm uppercase tracking-wide text-slate-500">Предстоящие</h2>
        <EventCardMyTicket
          v-for="t in upcoming"
          :key="t.id"
          :event="t.event!"
          :ticket-id="t.id"
        />
      </div>
      <div v-if="past.length" class="space-y-2">
        <h2 class="text-sm uppercase tracking-wide text-slate-500">Прошедшие</h2>
        <EventCardMyTicket
          v-for="t in past"
          :key="t.id"
          :event="t.event!"
          :ticket-id="t.id"
        />
      </div>
    </template>
  </section>
</template>
```

- [ ] **Step 2: `pages/tickets/[id].vue`**

```vue
<script setup lang="ts">
import { useTickets } from '~/composables/useTickets';
import { useShare } from '~/composables/useShare';

definePageMeta({ middleware: 'auth', layout: 'back' });

const route = useRoute();
const id = Number(route.params.id);
const ticketsApi = useTickets();
const { share } = useShare();

const { data: ticket, error } = await useAsyncData(
  () => `ticket-${id}`,
  () => ticketsApi.findOneMine(id),
);

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Билет не найден', fatal: true });
}

const qrRef = ref<{ toDataUrl: () => string | undefined } | null>(null);

const onDownload = () => {
  const url = qrRef.value?.toDataUrl?.();
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = `ticket-${ticket.value?.number ?? id}.png`;
  a.click();
};

const onShare = () => {
  const fullUrl = (typeof window !== 'undefined') ? window.location.href : '';
  share({ title: ticket.value?.event?.title, url: fullUrl });
};
</script>

<template>
  <div v-if="ticket" class="px-4 py-4 space-y-6 pb-20">
    <div class="flex items-center justify-end gap-2">
      <UButton color="gray" variant="ghost" icon="i-heroicons-arrow-down-tray" aria-label="Скачать" @click="onDownload" />
      <UButton color="gray" variant="ghost" icon="i-heroicons-share" aria-label="Поделиться" @click="onShare" />
    </div>

    <TicketQr v-if="ticket.qrPayload" ref="qrRef" :payload="ticket.qrPayload" />

    <TicketDetails :ticket="ticket" />

    <EventMap v-if="ticket.event?.venue" :venue="ticket.event.venue" />

    <EventOrganizerBlock v-if="ticket.event?.organizer" :organizer="ticket.event.organizer" />

    <section v-if="ticket.tier?.description" class="space-y-2">
      <h2 class="text-lg font-semibold">Правила использования</h2>
      <AppMarkdown :html="ticket.tier.description" />
    </section>
  </div>
</template>
```

- [ ] **Step 3: Smoke** — после mark-paid открыть `/tickets/<id>`, увидеть QR (просканить мобилкой → читаемая строка совпадает с qrPayload).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/app/pages/tickets/
git commit -m "feat(frontend): страницы списка билетов и билета с QR"
```

---

## Task 32: ЛК — `ProfileCard`, `AccountMenu`, `pages/account/index.vue`

**Files:**
- Create: `apps/frontend/app/components/account/ProfileCard.vue`
- Create: `apps/frontend/app/components/account/AccountMenu.vue`
- Create: `apps/frontend/app/pages/account/index.vue`

- [ ] **Step 1: `ProfileCard.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{
  user: { username: string; email: string; fullName?: string; avatar?: { url?: string } };
}>();

const initials = computed(() => {
  const src = props.user.fullName || props.user.username || '';
  return src.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
});
</script>

<template>
  <div class="flex items-center gap-3">
    <div class="w-16 h-16 rounded-full overflow-hidden bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xl font-semibold shrink-0">
      <img v-if="user.avatar?.url" :src="user.avatar.url" alt="" class="w-full h-full object-cover" />
      <span v-else>{{ initials }}</span>
    </div>
    <div class="min-w-0">
      <p class="font-semibold">{{ user.fullName || user.username }}</p>
      <p class="text-sm text-slate-400 truncate">{{ user.email }}</p>
    </div>
  </div>
</template>
```

- [ ] **Step 2: `AccountMenu.vue`**

```vue
<script setup lang="ts">
interface Item { label: string; to: string; icon: string }
defineProps<{ items: Item[] }>();
</script>

<template>
  <ul class="rounded-xl border border-slate-800 divide-y divide-slate-800 overflow-hidden">
    <li v-for="i in items" :key="i.to">
      <NuxtLink
        :to="i.to"
        class="flex items-center gap-3 px-4 py-3 hover:bg-slate-900/50"
      >
        <UIcon :name="i.icon" class="w-5 h-5 text-slate-400" />
        <span class="flex-1">{{ i.label }}</span>
        <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-slate-500" />
      </NuxtLink>
    </li>
  </ul>
</template>
```

- [ ] **Step 3: `pages/account/index.vue`**

```vue
<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

definePageMeta({ middleware: 'auth' });

const auth = useAuthStore();

const items = [
  { label: 'Избранное', to: '/account/favorites', icon: 'i-heroicons-heart' },
  { label: 'Связаться с менеджером', to: '/account/contact-manager', icon: 'i-heroicons-chat-bubble-left-right' },
  { label: 'Стать спикером', to: '/account/become-speaker', icon: 'i-heroicons-megaphone' },
  { label: 'Активные сессии', to: '/account/sessions', icon: 'i-heroicons-device-phone-mobile' },
];

const onLogout = async () => {
  await auth.logout();
  await navigateTo('/login');
};
</script>

<template>
  <section class="space-y-6">
    <ProfileCard v-if="auth.user" :user="auth.user" />
    <AccountMenu :items="items" />
    <UButton block color="red" variant="soft" icon="i-heroicons-arrow-right-on-rectangle" @click="onLogout">
      Выйти из аккаунта
    </UButton>
  </section>
</template>
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/app/components/account/ apps/frontend/app/pages/account/index.vue
git commit -m "feat(frontend): экран ЛК с профилем, меню и выходом"
```

---

## Task 33: Страница `/account/favorites`

**Files:**
- Create: `apps/frontend/app/pages/account/favorites.vue`

- [ ] **Step 1: `pages/account/favorites.vue`**

```vue
<script setup lang="ts">
import { useFavorites } from '~/composables/useFavorites';

definePageMeta({ middleware: 'auth', layout: 'back' });

const favsApi = useFavorites();
const { data: favs, pending, refresh } = await useAsyncData(
  'me-favorites',
  () => favsApi.listMine(),
  { default: () => [] },
);
</script>

<template>
  <section class="px-4 py-4 space-y-3">
    <h1 class="text-xl font-semibold">Избранное</h1>
    <div v-if="pending" class="space-y-2"><EventCardSkeleton v-for="i in 2" :key="i" /></div>
    <AppEmpty
      v-else-if="!favs.length"
      icon="i-heroicons-heart"
      title="Пусто"
      description="Отмечайте интересные мероприятия — они появятся здесь."
      cta-label="К мероприятиям"
      cta-to="/"
    />
    <div v-else class="grid gap-3 sm:grid-cols-2">
      <EventCard v-for="f in favs" :key="f.id" :event="(f.event as any)" />
    </div>
  </section>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/app/pages/account/favorites.vue
git commit -m "feat(frontend): страница избранного в ЛК"
```

---

## Task 34: Страницы `/account/become-speaker` и `/account/contact-manager`

**Files:**
- Create: `apps/frontend/app/pages/account/become-speaker.vue`
- Create: `apps/frontend/app/pages/account/contact-manager.vue`

- [ ] **Step 1: `become-speaker.vue`**

```vue
<script setup lang="ts">
import { z } from 'zod';
import { useSpeakerApplication } from '~/composables/useSpeakerApplication';
import { useAuthStore } from '~/stores/auth';
import { parseStrapiError } from '~/utils/api';

definePageMeta({ middleware: 'auth', layout: 'back' });

const auth = useAuthStore();
const { submit } = useSpeakerApplication();
const toast = useToast();

const schema = z.object({
  fullName: z.string().min(2, 'Введите ФИО'),
  email: z.string().email('Неверный email'),
  topic: z.string().optional(),
  description: z.string().optional(),
});

const state = reactive({
  fullName: auth.user?.username || '',
  email: auth.user?.email || '',
  topic: '',
  description: '',
});
const pending = ref(false);

const onSubmit = async () => {
  pending.value = true;
  try {
    await submit(state);
    toast.add({ color: 'green', title: 'Заявка отправлена' });
    await navigateTo('/account');
  } catch (err) {
    const parsed = parseStrapiError(err);
    toast.add({ color: 'red', title: 'Не удалось отправить', description: parsed.message });
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <section class="px-4 py-4 space-y-4">
    <h1 class="text-xl font-semibold">Стать спикером</h1>
    <UForm :schema="schema" :state="state" class="space-y-3" @submit.prevent="onSubmit">
      <UFormGroup label="ФИО" name="fullName" required><UInput v-model="state.fullName" /></UFormGroup>
      <UFormGroup label="Email" name="email" required><UInput v-model="state.email" type="email" /></UFormGroup>
      <UFormGroup label="Тема выступления" name="topic"><UInput v-model="state.topic" /></UFormGroup>
      <UFormGroup label="О чём хотите рассказать" name="description"><UTextarea v-model="state.description" :rows="5" /></UFormGroup>
      <UButton type="submit" block color="primary" :loading="pending">Отправить заявку</UButton>
    </UForm>
  </section>
</template>
```

- [ ] **Step 2: `contact-manager.vue`**

```vue
<script setup lang="ts">
import { z } from 'zod';
import { useManagerContact } from '~/composables/useManagerContact';
import { parseStrapiError } from '~/utils/api';

definePageMeta({ middleware: 'auth', layout: 'back' });

const { submit } = useManagerContact();
const toast = useToast();

const schema = z.object({
  subject: z.string().min(2, 'Введите тему'),
  message: z.string().min(2, 'Введите сообщение'),
  contactBack: z.string().optional(),
});

const state = reactive({ subject: '', message: '', contactBack: '' });
const pending = ref(false);

const onSubmit = async () => {
  pending.value = true;
  try {
    await submit(state);
    toast.add({ color: 'green', title: 'Сообщение отправлено' });
    await navigateTo('/account');
  } catch (err) {
    const parsed = parseStrapiError(err);
    toast.add({ color: 'red', title: 'Не удалось отправить', description: parsed.message });
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <section class="px-4 py-4 space-y-4">
    <h1 class="text-xl font-semibold">Связаться с менеджером</h1>
    <UForm :schema="schema" :state="state" class="space-y-3" @submit.prevent="onSubmit">
      <UFormGroup label="Тема" name="subject" required><UInput v-model="state.subject" /></UFormGroup>
      <UFormGroup label="Сообщение" name="message" required><UTextarea v-model="state.message" :rows="5" /></UFormGroup>
      <UFormGroup label="Как с вами связаться (телефон/email)" name="contactBack"><UInput v-model="state.contactBack" /></UFormGroup>
      <UButton type="submit" block color="primary" :loading="pending">Отправить</UButton>
    </UForm>
  </section>
</template>
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/app/pages/account/become-speaker.vue apps/frontend/app/pages/account/contact-manager.vue
git commit -m "feat(frontend): формы стать спикером и связаться с менеджером"
```

---

## Task 35: Перенос `/sessions` в `/account/sessions`

**Files:**
- Create: `apps/frontend/app/pages/account/sessions.vue`
- Modify: `apps/frontend/app/pages/sessions.vue`

- [ ] **Step 1: Создать `pages/account/sessions.vue`** — перенести содержимое из существующего `pages/sessions.vue` с переводом текстов на RU и подключением `back`-layout.

```vue
<script setup lang="ts">
import { useSessions, type DeviceSession } from '~/composables/useSessions';

definePageMeta({ middleware: 'auth', layout: 'back' });

const { list, revoke, revokeOthers } = useSessions();
const sessions = ref<DeviceSession[]>([]);
const pending = ref(false);
const errorMsg = ref<string | null>(null);

const refresh = async () => {
  pending.value = true;
  errorMsg.value = null;
  try { sessions.value = await list(); }
  catch (err: any) { errorMsg.value = err?.data?.error?.message || 'Не удалось загрузить сессии'; }
  finally { pending.value = false; }
};

const onRevoke = async (id: string) => { await revoke(id); await refresh(); };
const onRevokeOthers = async () => { await revokeOthers(); await refresh(); };

onMounted(refresh);
</script>

<template>
  <section class="px-4 py-4 space-y-4">
    <header class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">Активные сессии</h1>
      <UButton
        v-if="sessions.length > 1"
        size="xs" color="gray" variant="soft"
        @click="onRevokeOthers"
      >Завершить остальные</UButton>
    </header>
    <p v-if="errorMsg" class="text-sm text-red-400">{{ errorMsg }}</p>
    <p v-if="pending" class="text-sm text-slate-400">Загрузка…</p>
    <ul class="space-y-2">
      <li
        v-for="s in sessions"
        :key="s.documentId"
        class="rounded border border-slate-800 px-4 py-3 flex items-center justify-between"
        :class="{ 'border-indigo-500': s.current }"
      >
        <div>
          <div class="font-medium">
            {{ s.name || 'Неизвестное устройство' }}
            <span v-if="s.current" class="text-xs text-indigo-400 ml-2">(это устройство)</span>
          </div>
          <div class="text-xs text-slate-400">
            {{ s.platform }} · {{ s.ipAddress || '—' }} · был активен {{ new Date(s.lastActiveAt).toLocaleString('ru-RU') }}
          </div>
        </div>
        <UButton
          v-if="!s.current"
          size="xs" color="red" variant="soft"
          @click="onRevoke(s.documentId)"
        >Завершить</UButton>
      </li>
    </ul>
  </section>
</template>
```

- [ ] **Step 2: Перезаписать `pages/sessions.vue` редиректом**

```vue
<script setup lang="ts">
definePageMeta({ middleware: 'auth' });
await navigateTo('/account/sessions', { replace: true });
</script>
<template><div /></template>
```

- [ ] **Step 3: Smoke** — `/sessions` редиректит, `/account/sessions` показывает список.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/app/pages/account/sessions.vue apps/frontend/app/pages/sessions.vue
git commit -m "feat(frontend): перенести /sessions в /account/sessions с RU-текстами"
```

---

## Task 36: Переверстать `login.vue` и `register.vue` на UForm

**Files:**
- Modify: `apps/frontend/app/pages/login.vue`
- Modify: `apps/frontend/app/pages/register.vue`

- [ ] **Step 1: Перезаписать `login.vue`**

```vue
<script setup lang="ts">
import { z } from 'zod';
import { useAuthStore } from '~/stores/auth';
import { parseStrapiError } from '~/utils/api';

definePageMeta({ middleware: 'guest', layout: 'auth' });

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const schema = z.object({
  identifier: z.string().min(1, 'Введите email или логин'),
  password: z.string().min(1, 'Введите пароль'),
});

const state = reactive({ identifier: '', password: '' });
const pending = ref(false);

const onSubmit = async () => {
  pending.value = true;
  try {
    await auth.login({ identifier: state.identifier, password: state.password });
    const redirect = (route.query.redirect as string | undefined) || '/';
    await router.push(redirect);
  } catch (err) {
    const parsed = parseStrapiError(err);
    toast.add({ color: 'red', title: 'Не удалось войти', description: parsed.message });
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-xl font-semibold">Вход</h1>
    </template>
    <UForm :schema="schema" :state="state" class="space-y-3" @submit.prevent="onSubmit">
      <UFormGroup label="Email или логин" name="identifier" required>
        <UInput v-model="state.identifier" autocomplete="username" />
      </UFormGroup>
      <UFormGroup label="Пароль" name="password" required>
        <UInput v-model="state.password" type="password" autocomplete="current-password" />
      </UFormGroup>
      <UButton type="submit" block color="primary" :loading="pending">Войти</UButton>
    </UForm>
    <template #footer>
      <p class="text-sm text-slate-400">
        Нет аккаунта? <NuxtLink to="/register" class="text-indigo-400">Зарегистрироваться</NuxtLink>
      </p>
    </template>
  </UCard>
</template>
```

- [ ] **Step 2: Перезаписать `register.vue`**

```vue
<script setup lang="ts">
import { z } from 'zod';
import { useAuthStore } from '~/stores/auth';
import { parseStrapiError } from '~/utils/api';

definePageMeta({ middleware: 'guest', layout: 'auth' });

const auth = useAuthStore();
const router = useRouter();
const toast = useToast();

const schema = z.object({
  username: z.string().min(3, 'Минимум 3 символа'),
  email: z.string().email('Неверный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
});

const state = reactive({ username: '', email: '', password: '' });
const pending = ref(false);

const onSubmit = async () => {
  pending.value = true;
  try {
    const res = await auth.register({ username: state.username, email: state.email, password: state.password });
    if (!res.jwt) {
      toast.add({ color: 'green', title: 'Подтвердите email', description: 'На вашу почту отправлено письмо' });
      await router.push('/login');
    } else {
      await router.push('/');
    }
  } catch (err) {
    const parsed = parseStrapiError(err);
    toast.add({ color: 'red', title: 'Не удалось зарегистрироваться', description: parsed.message });
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-xl font-semibold">Создать аккаунт</h1>
    </template>
    <UForm :schema="schema" :state="state" class="space-y-3" @submit.prevent="onSubmit">
      <UFormGroup label="Логин" name="username" required>
        <UInput v-model="state.username" autocomplete="username" />
      </UFormGroup>
      <UFormGroup label="Email" name="email" required>
        <UInput v-model="state.email" type="email" autocomplete="email" />
      </UFormGroup>
      <UFormGroup label="Пароль" name="password" required>
        <UInput v-model="state.password" type="password" autocomplete="new-password" />
      </UFormGroup>
      <UButton type="submit" block color="primary" :loading="pending">Создать аккаунт</UButton>
    </UForm>
    <template #footer>
      <p class="text-sm text-slate-400">
        Уже есть аккаунт? <NuxtLink to="/login" class="text-indigo-400">Войти</NuxtLink>
      </p>
    </template>
  </UCard>
</template>
```

- [ ] **Step 3: Smoke** — login/register с auth-layout, ошибки показываются как toast'ы.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/app/pages/login.vue apps/frontend/app/pages/register.vue
git commit -m "feat(frontend): переверстать login и register на UForm с RU-текстами"
```

---

## Task 37: Playwright e2e — настройка и smoke-тест покупки

**Files:**
- Modify: `apps/frontend/package.json` (devDeps + script)
- Create: `apps/frontend/playwright.config.ts`
- Create: `apps/frontend/tests/e2e/fixtures/seed.ts`
- Create: `apps/frontend/tests/e2e/purchase-flow.spec.ts`
- Modify: `apps/frontend/.env.example` (опц., если есть)

- [ ] **Step 1: Установить Playwright**

```bash
cd apps/frontend && npm i -D @playwright/test
npx playwright install chromium
```

Добавить в `package.json` scripts:
```json
"test:e2e": "playwright test"
```

- [ ] **Step 2: `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://app.localhost';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: { baseURL, trace: 'on-first-retry', viewport: { width: 390, height: 844 } },
  projects: [{ name: 'chromium', use: { ...devices['Pixel 7'] } }],
});
```

- [ ] **Step 3: `tests/e2e/fixtures/seed.ts`**

Идемпотентный seed через Strapi REST с админ-токеном. Получает токен из `STRAPI_API_TOKEN` env.

```ts
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
      price: 100000, // 1000 ₽
      currency: 'RUB',
      sortOrder: 0,
      event: event.id,
    } },
  });

  return event;
}
```

- [ ] **Step 4: `tests/e2e/purchase-flow.spec.ts`**

```ts
import { test, expect, request } from '@playwright/test';
import { seedEvent } from './fixtures/seed';

const SLUG = 'e2e-conf-2026';
const username = `e2e_${Date.now()}`;
const email = `${username}@test.local`;
const password = 'pa55word';

test.beforeAll(async () => {
  const req = await request.newContext();
  await seedEvent(req);
  await req.dispose();
});

test('полный сценарий покупки билета', async ({ page }) => {
  // 1. Регистрация
  await page.goto('/register');
  await page.getByLabel('Логин').fill(username);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page).toHaveURL('/');

  // 2. Лента и тап на seed-event
  await expect(page.getByText('E2E конференция 2026')).toBeVisible();
  await page.getByText('E2E конференция 2026').click();
  await expect(page).toHaveURL(`/events/${SLUG}`);

  // 3. Купить
  await page.getByRole('button', { name: 'Купить' }).click();
  await expect(page).toHaveURL(`/events/${SLUG}/checkout`);

  // 4. +2 на Standard
  const stepperPlus = page.locator('button', { hasText: '+' }).first();
  await stepperPlus.click();
  await stepperPlus.click();

  // 5. Оформить
  await page.getByRole('button', { name: 'Оформить' }).click();
  await expect(page).toHaveURL(`/events/${SLUG}/checkout/pay`);

  // 6. Анкеты
  const fullName = page.getByLabel('ФИО');
  await fullName.nth(0).fill('Иванов Иван');
  await fullName.nth(1).fill('Петров Пётр');

  // 7. Способ оплаты + согласие
  await page.getByText('Картой').click();
  await page.getByLabel(/Согласен/).check();

  await page.getByRole('button', { name: 'Оплатить' }).click();

  // 8. Mock-pay
  await page.waitForURL(/\/orders\/\d+\/pay/);
  await page.getByRole('button', { name: 'Симулировать оплату' }).click();

  // 9. /tickets — 2 строки
  await page.waitForURL('/tickets');
  await expect(page.getByText('E2E конференция 2026').nth(0)).toBeVisible();
});
```

- [ ] **Step 5: Запустить тест**

Поднять стек: `make dev`. В Strapi Admin создать API token (Settings → API Tokens → Full access). Экспортировать `STRAPI_API_TOKEN` в shell. Запустить:

```bash
cd apps/frontend && STRAPI_API_TOKEN=<token> npm run test:e2e
```

Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/playwright.config.ts apps/frontend/tests/e2e/ apps/frontend/package.json apps/frontend/package-lock.json
git commit -m "test(frontend): добавить Playwright e2e smoke полного сценария покупки"
```

---

## Task 38: Финальный smoke + DoD-чеклист

**Files:** —

- [ ] **Step 1: Прогнать unit-тесты**

Run: `cd apps/frontend && npm test`
Expected: все unit-тесты зелёные (format, api, sanitize, cart, favorites).

- [ ] **Step 2: Type-check через build**

Run: `npm run build`
Expected: завершается без TypeScript-ошибок. Допустимы warning'и от модулей, но не errors.

- [ ] **Step 3: PWA-проверка через Lighthouse**

Запустить prod-сборку: `npm run build && npm run preview`. Открыть в Chrome → DevTools → Lighthouse → PWA. Ожидать «Installable» PASS.

- [ ] **Step 4: Mobile/Desktop smoke в браузере**

В DevTools переключить на mobile (390×844). Пройти e2e-сценарий вручную. Проверить bottom-nav, safe-area, sticky CartSummary, sticky checkout-низ. Затем переключить на desktop ≥1024 — top-nav виден, bottom-nav скрыт.

- [ ] **Step 5: Проверить DoD чеклист (см. §15 спека)**

Пройти по каждому пункту DoD из спека. Зафиксировать в комментарии PR/коммит-меседже выполненные пункты.

- [ ] **Step 6: Финальный коммит (если нужны мелкие доработки в utils/конфигах)**

```bash
git add -A
git commit -m "chore(frontend): финальный smoke и доработки по DoD"
```

---

## Self-Review (заметки автора плана)

**Spec coverage:**
- §1 Цель/объём — Tasks 1–37 покрывают все экраны и поток покупки.
- §2 Архитектурные решения — все 20 решений отражены: Nuxt UI v4 (Task 2), Tailwind v4 dark (Tasks 2/14), Pinia stores (7,8), composables (9–11), типы DTO (4,6), RU-форматтеры (3), mobile-first (13–14), auth остаётся (8 hook), cart TTL (7), promo (10,26), mock-pay env-флаг (29), iframe-карта (16), QR (30), share (11), toast (12), zod-формы (27,34,36), DOMPurify (5), иконки (13).
- §3 Структура файлов — все папки/файлы созданы соответствующими тасками.
- §4 Карта роутов — все роуты покрыты (Tasks 21,22,24,26,28,29,31,32,33,34,35,36).
- §5 Типы DTO — Task 6.
- §6 Composables — Tasks 9–11.
- §7 Stores cart/favorites — Tasks 7,8.
- §8 Доменные компоненты — Tasks 13,15–20,23,25,27,30,32.
- §9 Поток покупки — Tasks 26,28,29,31.
- §10 ЛК — Tasks 32–35.
- §11 Зависимости и темизация — Task 2.
- §12 Loading/empty/error — Tasks 15, плюс по месту в страницах.
- §13 Безопасность фронта — Task 5 (sanitize), Task 16 (iframe sandbox), §неявно остальное.
- §14 Тесты — Tasks 3,4,5,7,8 (unit) + 37 (e2e).
- §15 DoD — Task 38.
- §16 Open questions — вне скоупа, упомянуты в спеке.

**Placeholder scan:** «TBD» / «implement later» / «similar to Task N» — отсутствуют. Все шаги содержат конкретный код или команду.

**Type consistency:** `cart.add(tier, qty, eventSlug)`, `cart.setQty(tierId, qty)`, `cart.byTier(id)`, `cart.subtotal/discount/total`, `cart.itemsCount/isEmpty` — единообразно используются между Task 7 (определение) и Tasks 25/26/28 (потребители). `useFavorites().add/remove/listMine/ensureLoaded/isFavorite` единообразны (Tasks 10/18/33). `useOrder().previewPromo/create/markPaid/listMine/findOneMine` — Tasks 10/26/28/29.

**Известные пограничные случаи (выходят за скоуп v1, фиксированы в §16 спека):**
- Кнопка «Скачать» билет — реализована как PNG (canvas → dataURL); PDF не делаем.
- Email-confirmation flow — если бэк включит, register просто не получит jwt и редиректит на /login (см. Task 36).
- Авто-pagination на главной — пока pageSize=20, без infinite scroll.
- Карта без SDK — `mapEmbed` или deep-link на Я.Карты.

