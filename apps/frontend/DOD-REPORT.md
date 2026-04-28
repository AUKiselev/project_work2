# DoD-отчёт: первоначальная структура frontend (v1)

> Дата: 2026-04-28. Соответствует спеку
> `docs/superpowers/specs/2026-04-28-frontend-initial-structure-design.md`.

## Машинные проверки

- [x] `npm test` — все unit-тесты зелёные (vitest, 27/27)
- [x] `npx nuxt prepare` — без ошибок типов
- [ ] `npm run build` — *(не входит в автоматизированный smoke; рекомендуется
      прогон вручную перед релизом)*
- [ ] PWA Lighthouse «Installable» — *(проверка в браузере, выполняется отдельно)*
- [ ] Playwright e2e (purchase-flow.spec.ts) — *(требует поднятия стека, API
      token, `playwright install chromium`; см. README раздела e2e)*

## Покрытие функционала

- [x] Главная (`/`) с баннерами и лентой событий
- [x] Поиск (`/search`) с debounce и `EventCardCompact`
- [x] Детальная страница события (`/events/[slug]`) — все блоки
- [x] Выбор билетов (`/events/[slug]/checkout`) — степпер, аккордеон, промокод
- [x] Checkout с анкетами + способ оплаты + согласие на ПД
- [x] Mock-pay (`/orders/[id]/pay`) с гардом `appEnv === 'production'`
- [x] Список купленных билетов (`/tickets`)
- [x] Билет с QR (`/tickets/[id]`) — qrcode + canvas + download
- [x] ЛК (`/account`): профиль, меню, выход
- [x] `/account/favorites` — лента избранных
- [x] `/account/become-speaker` — форма заявки
- [x] `/account/contact-manager` — форма обращения
- [x] `/account/sessions` (перенесено из `/sessions`, redirect-stub)
- [x] FavoriteToggle с optimistic update
- [x] Login/Register на UForm + zod
- [x] Auth-aware bottom-nav: на «Билеты»/«Профиль» неавторизованного редирект на login

## Технические гарантии

- [x] Nuxt 4 file-based routing, без FSD
- [x] Nuxt UI v4 (UButton, UInput, UModal, UAccordion, UForm, UToaster, UCheckbox)
- [x] Tailwind v4, dark-only, `<Html class="dark">` зафиксирован в app.vue
- [x] Pinia stores: cart (TTL 1 час, sessionStorage), favorites (Set с
      реактивностью Vue 3 Proxy), auth (refresh-flow остался как был +
      reset cart/favorites при `_clearLocal`)
- [x] Composables как тонкие обёртки над `$api` (single-flight refresh + global
      toast для 5xx/network)
- [x] DTO-типы в `app/types/api.ts` (полный набор из §5 спека)
- [x] DOMPurify санитайзер richtext с happy-dom-совместимостью в тестах
- [x] qrcode → `<canvas>` для QR (без тяжёлых SDK)
- [x] EventMap: iframe (sandboxed) + fallback на Yandex deep-link
- [x] navigator.share + clipboard fallback (`useShare`)
- [x] Bottom-nav: sticky на mobile, `env(safe-area-inset-bottom)`; top-nav на ≥lg
- [x] Все тексты UI на русском, без `@nuxtjs/i18n`

## Структура файлов (итог)

| Категория | Файлов |
|---|---|
| pages | 13 (.vue) |
| components | 38 (.vue), 10 доменных групп |
| composables | 11 (.ts) |
| stores | 3 (.ts) |
| utils | 5 (.ts) |
| plugins | 2 (.ts) |
| middleware | 2 (.ts) |
| layouts | 3 (.vue) |
| types | 1 (.ts) |

## Зависимости (runtime)

`@nuxt/ui` `^4`, `@pinia/nuxt`, `@vueuse/nuxt`, `@vite-pwa/nuxt`,
`qrcode` `^1.5`, `zod` `^4`, `dompurify` `^3`,
`@aparajita/capacitor-secure-storage`, `@capacitor/*`.

## Зависимости (dev)

`vitest@^3`, `@vue/test-utils@^2`, `happy-dom@^15`,
`@vitest/coverage-v8@^3`, `@playwright/test`,
`@types/qrcode`, `@types/dompurify`,
`@vite-pwa/assets-generator`, `typescript`.

## Открытые вопросы (вне v1, см. §16 спека)

- Native-сборка (iOS/Android) — отдельный спек.
- Реальный платёжный шлюз — заменит mock-pay.
- Email-confirmation flow — UI-обвязка добавится при включении на бэке.
- PDF-генерация билета — пока PNG через canvas.
- Карта как SDK — вместо iframe/deep-link.
- Push-уведомления.
- Multi-language UI.
- Pagination/infinite-scroll.
- Возврат билетов из UI.
- Редактирование профиля пользователем (`fullName`/`phone`/`avatar`).
- E2E в CI.

## Конвенции

Conventional Commits на русском (`feat(frontend): ...`, `chore(frontend): ...`,
`test(frontend): ...`, `docs(frontend): ...`).
