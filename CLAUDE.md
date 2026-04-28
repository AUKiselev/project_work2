# Project: Events & Tickets Platform

> **Override over global `~/.claude/CLAUDE.md`:**
> 1. Бэкенд — **Strapi 5** (Node.js + TypeScript), а не Django/DRF. Все упоминания
>    Django в глобальных правилах **не применяются здесь**.
> 2. Фронтенд — **нативная архитектура Nuxt 4**, **FSD не используется**. Глобальное
>    правило про Feature-Sliced Design здесь отменено.
> 3. Локализация — **только русский язык**. Глобальное правило про i18n
>    `ru/uz/en` здесь отменено: на старте поддерживаем только RU, без `@nuxtjs/i18n`
>    и переводов на uz/en.
> 4. Tailwind, Pinia, Nuxt UI и git/коммит-конвенции из глобального файла
>    остаются в силе.

## Что строим

Платформа продажи билетов на мероприятия (конференции, выступления спикеров и т. п.).
Источник истины по UX — `docs/product/screens.md` (текстовая транскрипция вайрфреймов).
Доменные термины — `docs/product/glossary.md`. Предлагаемая модель данных —
`docs/product/data-model.md`.

Ключевые сущности (детали — в `data-model.md`):

- **Event** (Мероприятие) — основная сущность каталога: фото, дата, место, описание,
  программа, спикеры, фото с прошлых мероприятий.
- **TicketTier** (Категория билета) — внутри Event: «Билет 1», «Билет 2», цена, описание.
- **Speaker** (Спикер) — карточка с фото, ФИО, описание/профиль.
- **Order** (Заказ) — покупка одной или нескольких категорий билетов.
- **Ticket** (Билет / экземпляр) — конкретный купленный билет с **анкетой посетителя**,
  QR-кодом, номером.
- **Promo** (Промокод).
- **Favorite** (Избранное / "Мне интересно").
- **User** + **DeviceSession** (уже реализовано в `apps/backend/src/api/session/`).

## Стек (актуальный)

### Backend — `apps/backend/` (Strapi 5)
- Strapi 5 + TypeScript, PostgreSQL 16.
- Auth: `users-permissions` в режиме `refresh` + сайдкар `Session` (см.
  `apps/backend/src/api/session/`). Дедуп по `(user, deviceId)`.
- Кастомные API → `src/api/<resource>/` (controllers / routes / services /
  content-types).
- Расширения core-плагинов → `src/extensions/`.
- Хуки моделей — через `lifecycles.ts` или Document Service Middlewares.

### Frontend — `apps/frontend/` (Nuxt 4 + Capacitor)
- Nuxt 4.x SSR + Capacitor 8 (Web / PWA / Android / iOS).
- **Архитектура — нативная Nuxt 4. FSD не применяем.** Используем стандартные
  директории `app/`:
  - `app/pages/` — роутинг по файлам.
  - `app/layouts/` — лэйауты.
  - `app/components/` — компоненты. Допустима группировка по доменной области
    (`app/components/event/`, `app/components/ticket/`, `app/components/checkout/`),
    но **без слоёв FSD** (`shared/entities/features/widgets/pages` не вводим).
  - `app/composables/` — `useXxx.ts` (доменная или общая логика).
  - `app/stores/` — Pinia сторы (`useXxxStore`).
  - `app/middleware/` — route middleware.
  - `app/plugins/` — Nuxt-плагины (`$api` и т. п.).
  - `app/utils/` — чистые утилиты без побочных эффектов.
  - `app/server/` — серверные API/middleware Nuxt (если нужны BFF-эндпоинты).
  - `app/assets/` — стили, изображения для бандла.
- UI: **Nuxt UI** + **Tailwind CSS** + SCSS (когда нужны кастомные стили).
- State: **Pinia** (см. `app/stores/auth.ts`).
- HTTP: плагин `$api` с авто-refresh на 401 в single-flight (см. README.md
  раздел «Авторизация»).
- Локализация: **только RU**. Тексты пишем напрямую по-русски, без i18n-ключей
  и без `@nuxtjs/i18n`. См. секцию «Локализация» ниже.
- Хранилище токенов: `app/utils/storage.ts` (web — HttpOnly cookie + memory,
  mobile — Keychain / EncryptedSharedPreferences).

### Инфраструктура
- Traefik (`infra/traefik`) — единый ingress (`app.<domain>` / `api.<domain>`).
- Docker Compose — `infra/docker/{dev,prod}` + `compose.base.yml`.
- Единый `.env` в корне репозитория.

## Маршрутизация задач (поверх глобального протокола)

Глобальные агенты (`agent-architector`, `agent-manager`, `agent-dev`, `agent-qa`)
применяются как описано в `~/.claude/CLAUDE.md`, но с поправкой на стек:

| Тип задачи | Агент | Что важно для этого проекта |
|---|---|---|
| Новый Content Type / API в Strapi | architector → dev → qa | Определить связи (relations), policies, lifecycles, sanitization. Сгенерировать через `npx strapi generate` где возможно. |
| Новый Nuxt-модуль (страница/фича) | architector → dev | Раскладка по нативной структуре Nuxt (см. выше, **не FSD**); тексты на русском напрямую (без i18n); адаптация под mobile (Capacitor) и PWA. |
| Hotfix / мелкий баг | dev напрямую | См. `apps/<part>/README.md` за специфичными подсказками. |
| Тесты | qa | Backend — Jest + Strapi factories; Frontend — Vitest + Vue Test Utils, e2e — Playwright. |

## Конвенции

### Код
- TypeScript везде (Strapi и Nuxt).
- Strapi: префиксы кастомных ресурсов читаемые kebab-case (`event-ticket`,
  `speaker-profile`).
- Nuxt: компоненты в `PascalCase.vue`, composables — `useXxx.ts`, stores —
  `useXxxStore` через `defineStore('xxx', ...)`.
- Доменные термины из `glossary.md` использовать в коде в **английских
  эквивалентах** (`event`, `ticket`, `tier`, `speaker`, `order`, `attendee`,
  `promo`, `favorite`).

### Git
- Conventional Commits **на русском** (как в глобальном CLAUDE.md):
  `feat(events): добавить эндпоинт списка мероприятий`.
- Scope = модуль (`events`, `tickets`, `auth`, `frontend`, `backend`, `infra`).

### Локализация (RU only)
- Тексты UI пишем **сразу по-русски** в шаблонах/компонентах.
- `@nuxtjs/i18n` и любые переводы (uz/en) **не подключаем** — это явное решение
  на v1, а не упущение.
- Если в будущем понадобится мультиязычность — это отдельная задача с
  обсуждением (миграция на ключи, выбор стратегии для контента в Strapi).
- Доменные термины (русское UI-наименование ↔ английское в коде) — см.
  `docs/product/glossary.md`.

### Безопасность
- Refresh-токены: web → HttpOnly+Secure cookie; mobile → secure storage. Никогда
  не логировать.
- Валидация на бэке обязательна, даже если есть на фронте.
- Service worker `/api/*` принудительно `NetworkOnly` (см. README.md раздел PWA).

## Где смотреть в первую очередь

- Запуск dev: `make dev` (см. `README.md` раздел «Быстрый старт»).
- Spec продукта: `docs/product/screens.md`.
- Глоссарий: `docs/product/glossary.md`.
- Модель данных: `docs/product/data-model.md`.
- Auth: README.md раздел «Авторизация» + `apps/backend/src/api/session/`
  + `apps/frontend/app/stores/auth.ts`.

## Что НЕ делать

- Не добавлять Django-зависимости — стек проекта Strapi 5.
- Не вводить FSD-слои (`shared/entities/features/widgets/pages`) и не реорганизовывать
  фронт «по FSD». Архитектура фронта — нативная Nuxt 4.
- Не тащить дополнительные UI-киты помимо Nuxt UI без обсуждения.
- Не кэшировать `/api/*` в service worker.
- Не коммитить `.env`, ключи Strapi, секреты Capacitor.
- Не логировать токены, QR-payload билетов, персональные данные из анкет.
