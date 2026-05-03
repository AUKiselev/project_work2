# Prototype Polish — design spec

> Задача: «привести прототип к более правдивому виду приложения» — точечные
> визуальные доработки без анимаций. Объём — средний, между мелочью и крупной
> фичей. Главный критерий «готово»: все кнопки и элементы работают корректно
> (не остаются заглушки на якоря).

## Контекст

Прототип Events & Tickets проходил рефакторинг (см. предыдущие коммиты на
`main` после `15ffc17`): починен SSR главной, темизация Nuxt UI v4, populate
relations событий через корректный auth-pipeline, dev-seed с программой
мероприятий. На этом этапе функциональный прототип работает, но визуально
выглядит «голо»: однотонный `bg-slate-950`, login/register без визуальных
акцентов, нет footer, EventCard без категории / площадки / индикатора
заполненности, empty-states используют одну иконку.

Подход — **hybrid**: новые переиспользуемые компоненты только там где имеет
смысл (Footer, бейджи, EmptyIllustration). Декор-блобы встраиваются прямо
в layouts. Никаких анимаций. Никакого re-architect — точечные добавления
к существующей нативной структуре Nuxt 4.

## Scope (из брейнсторма)

**Включено:** C (Footer на desktop) · D (обогащение EventCard) · F (фоновые
декорации) · G (AppEmpty с SVG) · объединение Вход/Регистрация в одну кнопку.

**Явно исключено (YAGNI):**

- Никаких анимаций (CSS keyframes, Vue transitions).
- Hero-секция на главной — не делаем.
- Split-layout на login/register — не делаем.
- Stats-блок на профиле — не делаем.
- Темизация и цвета не меняются — всё через существующие токены
  `primary` / `gray`.
- Не трогаем `layouts/back.vue`, не реорганизуем структуру компонентов.

## 1. Объединение Вход / Регистрация → одна кнопка

**Цель:** в шапке одна кнопка «Войти», регистрация доступна со страницы входа.

- `apps/frontend/app/components/AppTopNav.vue` — две ссылки `/login` + `/register`
  заменяются на одну `<UButton to="/login" color="primary" variant="solid">Войти</UButton>`.
  Расположение — справа в шапке, как сейчас.
- `apps/frontend/app/pages/login.vue` — нижний блок «Нет аккаунта? Регистрация»
  превращается в более заметный CTA: разделитель + полноширинная
  `<UButton variant="ghost" to="/register" block>Создать аккаунт</UButton>`
  под формой входа. Текст «Нет аккаунта?» остаётся как подпись над кнопкой.
- `apps/frontend/app/pages/register.vue` — без изменений (там уже есть ссылка
  «Уже есть? Войти»).
- `apps/frontend/app/components/AppBottomNav.vue` — пункт «Профиль» сохраняет
  поведение редиректа на `/login` для неавторизованных. Не трогаем.

## 2. Backend: Category content-type

**Цель:** ввести гибкие категории событий через relation, не enum.

### Новый content-type `Category`

Путь: `apps/backend/src/api/category/`.

```jsonc
// content-types/category/schema.json
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

Routes — стандартный `createCoreRouter`. В `apps/backend/src/index.ts`
расширить `PUBLIC_ACTIONS` записями `api::category.category.find` и
`api::category.category.findOne`.

### Расширение `Event`

В `apps/backend/src/api/event/content-types/event/schema.json` добавить
аттрибут:

```json
"category": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "api::category.category"
}
```

Кастомный controller `apps/backend/src/api/event/controllers/event.ts`:

- `findBySlug` — populate расширяется полем `category: true`.
- `search` — populate тоже расширяется `category: true`.

Для дефолтного `find` — populate уже идёт явным массивом параметров с фронта,
надо убедиться что фронт включает `category` в список.

## 3. Backend: availability endpoint

**Цель:** реальный счётчик `remaining = capacity − sold` для бейджа
«осталось N мест».

### Источник «sold»

Через прямой `event` FK у `Ticket` со status valid|used (выпущенные и
использованные билеты, занимающие capacity; refunded/cancelled освобождают
место). Enum значений: `valid | used | refunded | cancelled`.

### Endpoint

Новый route в `apps/backend/src/api/event/routes/event.ts`:

```ts
{
  method: 'GET',
  path: '/events/:slug/availability',
  handler: 'api::event.event.availability',
}
```

> Без `config: { auth: false }` — следуем тому же фиксу что в `find/findOne`,
> опираемся на `authenticate` middleware и public-permissions через
> `PUBLIC_ACTIONS`. В `PUBLIC_ACTIONS` добавляется
> `api::event.event.availability`.

Controller-метод `availability(ctx)`:

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

Фронт вызывает `/api/events/:slug/availability` отдельно при рендере
EventCard / EventHero — либо в `useAsyncData` рядом с основным запросом
события, либо одним батчем в Pinia сторе при загрузке списка. Конкретный
способ выбирает план.

## 4. Сидер: категории и mock-проданные билеты

`apps/backend/src/seed/dev-seed.ts` обновляется (идемпотентно):

### Категории (4 шт, идемпотентность по `slug`)

| slug          | title       | colorToken |
|---------------|-------------|------------|
| `meetup`      | Митап       | sky        |
| `conference`  | Конференция | primary    |
| `workshop`    | Воркшоп     | emerald    |
| `lecture`     | Лекция      | violet     |

### Привязка категорий к событиям

- `tech-meetup-spring-2026` → category=`meetup`
- `product-conference-2026` → category=`conference`

### Mock-проданные билеты

Цель: показать что Tech Meetup в начале продаж (остаток ~70%), а Product
Conference близок к sold-out (остаток ~15%) — визуально подтверждает работу
AvailabilityBadge.

- Для `tech-meetup-spring-2026` (capacity=100): создать ~30 paid-билетов
  (конкретное число и распределение по tier — решает план).
- Для `product-conference-2026` (capacity=100): ~85 paid-билетов.

Если для создания `Ticket`/`Order` нужен User — сидер создаёт одного
seed-юзера `seed-customer@example.com` (идемпотентно по email) и
оформляет всё на него. Все детали (модели Order/Ticket, обязательные поля,
relations) уточняются в плане после чтения схем.

Идемпотентность: повторный `npm run seed` не плодит дублей категорий или
билетов (counter сравнивается с целевым; если уже ≥ цели — пропускаем).

## 5. Frontend: новые и изменённые компоненты

### Новые компоненты (`apps/frontend/app/components/`)

- **`CategoryBadge.vue`** — props: `{ category: { title, colorToken } }`.
  Рендер: маленький pill (rounded-full px-2 py-0.5 text-xs) с
  `colorToken`-bg-soft + текст. Используется в EventCard, EventHero,
  EventCardCompact.
- **`AvailabilityBadge.vue`** — props: `{ capacity: number, remaining: number }`.
  Логика: рендерится только если `remaining > 0 && remaining / capacity ≤ 0.2`.
  Текст «Осталось N мест». Цвет: `amber` при `> 10%`, `rose` при `≤ 10%`.
  Используется в EventCard и EventHero.
- **`AppFooter.vue`** — desktop-only (`hidden lg:block`). Содержимое см. п.6.
- **`AppDecorBackground.vue`** — slot-обёртка. Рендерит за контентом
  2-3 absolute `blur-3xl` div'а с цветами темы (primary / violet) низкой
  непрозрачности (`opacity-20`/`opacity-30`). Props:
  `variant: 'auth' | 'page' | 'subtle'` — управляет компоновкой и плотностью
  блобов. Без анимации, чисто статичный декор.
- **`EmptyIllustration.vue`** — props: `{ name: 'favorites' | 'tickets' |
  'search' | 'generic' }`. Один компонент со switch-case по `name`,
  возвращает inline `<svg>` ~120×120.

### Изменённые компоненты

- **`EventCard.vue`** — над title новый ряд:
  `<CategoryBadge v-if="event.category" />` +
  `<AvailabilityBadge v-if="availability" :capacity :remaining />`. Под датой
  добавить мелкое название площадки `<div class="text-xs text-slate-400 truncate">{{ event.venue?.name }}</div>`.
  `availability` приходит либо как prop из родителя, либо через отдельный
  запрос на `/api/events/:slug/availability` (план уточняет).
- **`EventCardCompact.vue`** — `<CategoryBadge>` в строке заголовка, мелкий
  шрифт. Без AvailabilityBadge (компактный вид).
- **`EventHero.vue`** — над title в overlay добавить `<CategoryBadge>` если
  есть, и `<AvailabilityBadge>` рядом с ним (если данные есть).
- **`AppEmpty.vue`** — заменить иконку на `<EmptyIllustration :name="...">`.
  Старый `icon` prop оставить как fallback (если `name` не задан).

## 6. Footer (C)

**`AppFooter.vue` — структура:**

- Видимость: `hidden lg:block`. На mobile его роль играет bottom-nav, footer
  не нужен.
- Background: `border-t border-slate-800 bg-slate-950`.
- Контейнер: `container mx-auto py-10 grid grid-cols-4 gap-8`.
- Колонка 1 — лого + краткое описание платформы (1-2 строки текста).
- Колонка 2 — заголовок «Платформа», ссылки `NuxtLink`:
  - «О нас» → `/info/about`
  - «Контакты» → `/info/contacts`
  - «Стать спикером» → `/account/become-speaker`
- Колонка 3 — заголовок «Документы», ссылки:
  - «Пользовательское соглашение» → `/info/terms`
  - «Публичная оферта» → `/info/offer`
- Колонка 4 — заголовок «Соцсети», иконки `<UIcon>` (Telegram / VK / YouTube)
  с внешними `<a href target="_blank" rel="noopener">` на placeholder-URL'ы.
- Нижняя плашка: `border-t border-slate-800 py-4 text-center text-xs
  text-slate-500` — `© 2026 Клуб Спикеров. Все права защищены.`

Подключается в `apps/frontend/app/layouts/default.vue` после `<slot/>`,
перед `<AppBottomNav>`.

## 7. Info-страницы (C-1.a)

Четыре новые страницы под `apps/frontend/app/pages/info/`:

- `pages/info/about.vue` — «О платформе»: 3-4 абзаца про платформу
  (миссия, формат событий, для кого).
- `pages/info/contacts.vue` — реквизиты: email поддержки, телефон, юр.адрес
  заглушкой; компактная форма обратной связи. Переиспользуем тот же endpoint
  `POST /api/manager-contact-requests` что и `pages/account/contact-manager.vue`
  (он уже в `PUBLIC_ACTIONS`, доступен анонимно). На анонимной форме
  юзер вводит свой email/контакт явно, на auth-форме email подтягивается
  из профиля.
- `pages/info/terms.vue` — пользовательское соглашение: 5-6 абзацев
  заглушечного, но осмысленного RU-текста (предмет соглашения,
  права/обязанности сторон, ответственность, изменения).
- `pages/info/offer.vue` — публичная оферта на покупку билетов:
  4-5 абзацев (продавец, предмет, оплата, возврат).

Все четыре:

- используют `layouts/default.vue`;
- оборачивают контент в `<AppDecorBackground variant="subtle">`;
- структура: `<h1 class="text-2xl font-semibold mb-6">…</h1>` +
  `<div class="prose prose-invert max-w-3xl">…</div>` (Nuxt UI v4
  включает Tailwind Typography);
- тексты пишем вручную, не лорем.

## 8. Decor backgrounds (F)

Применение `<AppDecorBackground>`:

- `apps/frontend/app/layouts/auth.vue` — оборачиваем slot в
  `<AppDecorBackground variant="auth">`. Блобы `primary` + `violet` снизу.
- `apps/frontend/app/pages/account/become-speaker.vue` и
  `pages/account/contact-manager.vue` — `variant="subtle"` на корневом блоке
  страницы.
- `apps/frontend/app/pages/info/*.vue` — `variant="subtle"`.
- `apps/frontend/app/components/AppEmpty.vue` — `variant="subtle"` фоном
  за иллюстрацией.
- `layouts/default.vue` — НЕ трогаем (там много контента, декор будет
  лишним).

## 9. EmptyIllustration SVG (G)

Четыре сцены, inline-SVG ~120×120, в стиле «outline + soft accent»:

- **`favorites`** — сердечко с пунктирным контуром, маленькие искры-точки
  вокруг.
- **`tickets`** — стилизованный билет с перфорацией, рядом часы.
- **`search`** — лупа над пустым полем.
- **`generic`** — облачко с многоточием.

Цвета: `stroke="currentColor"` (наследует от текста родителя), accent —
`text-primary-400/50`. Никаких внешних изображений, всё inline.

Применяются:

- `account/favorites.vue` empty → `name="favorites"`
- `tickets/index.vue` empty → `name="tickets"`
- `search.vue` empty → `name="search"`
- любой другой `<AppEmpty>` без явного `name` → `generic`

## 10. Definition of Done (что проверяет QA)

1. В `AppTopNav` одна кнопка «Войти» вместо двух. На `/login` есть
   видимая кнопка «Создать аккаунт».
2. На главной EventCard показывает `CategoryBadge` + venue-name.
   На карточке Product Conference виден `AvailabilityBadge`
   «Осталось ~15 мест».
3. `GET /api/events/:slug/availability` возвращает
   `{ capacity, sold, remaining }` без 5xx.
4. `Category` доступен через `GET /api/categories` (public).
5. Footer виден на ≥1024px и не виден на мобиле. Все 5 внутренних
   ссылок (`/info/about`, `/info/contacts`, `/account/become-speaker`,
   `/info/terms`, `/info/offer`) открывают существующие страницы без 404.
   Три иконки соцсетей имеют `target="_blank" rel="noopener"` и валидные
   placeholder-href (не `#`).
6. Все 4 info-страницы открываются без ошибок и содержат осмысленный
   RU-текст в `prose prose-invert`.
7. На страницах с пустыми списками (избранное, билеты, пустой поиск)
   видны SVG-иллюстрации вместо одной иконки.
8. На `/login`, `/register`, `/account/become-speaker`,
   `/account/contact-manager`, `/info/*` и в empty-state видны мягкие
   фоновые блобы (без анимации).
9. `npm run seed` дважды подряд → нет дублей категорий, mock-билетов,
   seed-юзера.
10. Все ранее работавшие 13 страниц + 4 новые info-страницы → SSR 200,
    без регрессий.

## Открытые вопросы для плана

- Точная схема `Ticket` / `Order` в `apps/backend/src/api/{ticket,order}/` —
  определит форму запроса для `availability` и формат mock-данных в сидере.
- Формат данных availability на фронте: отдельный запрос на каждую карточку
  vs. батч-эндпоинт vs. поле в составе populate. Решает план после оценки
  количества запросов на главной.
- Источник icon-данных для соц-сетей в footer (Heroicons не имеет логотипов
  Telegram/VK/YouTube — возможно через `@iconify-json/simple-icons` или SVG
  inline).
