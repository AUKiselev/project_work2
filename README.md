# project_work2

Монорепо: веб-приложение на **Nuxt 4**, backend на **Strapi 5** с **PostgreSQL**,
единая точка входа — **Traefik**, всё упаковано в **Docker**. Фронтенд
дополнительно собирается под **iOS / Android** через Capacitor.

## Архитектура первого уровня

```
                      ┌────────────────────┐
                      │      Traefik       │  :80 / :443
                      │  (ACME, routing)   │
                      └──────┬──────┬──────┘
                             │      │
           app.<domain> ─────┘      └───── api.<domain>
                 │                              │
         ┌───────▼────────┐              ┌──────▼─────────┐
         │   Nuxt 4 (SSR) │              │   Strapi 5     │
         │   apps/frontend│              │   apps/backend │
         └───────┬────────┘              └──────┬─────────┘
                 │                              │
                 │                       ┌──────▼─────────┐
                 │                       │  PostgreSQL 16 │
                 │                       │   (internal)   │
                 │                       └────────────────┘
                 │
        ┌────────▼─────────┐
        │ Capacitor wrap   │  iOS / Android
        │ (nuxt generate)  │  → бьёт в api.<domain>
        └──────────────────┘
```

## Структура

```
.
├── .env                      единственный источник переменных (игнорируется git)
├── .env.example              шаблон со всеми переменными
├── Makefile                  короткие команды
├── apps/
│   ├── frontend/             Nuxt 4 + Capacitor
│   └── backend/              Strapi 5
└── infra/
    ├── docker/
    │   ├── compose.base.yml  база (сервисы, сети, тома)
    │   ├── dev/
    │   │   ├── compose.yml         dev-оверрайд (hot reload, открытые порты)
    │   │   ├── frontend.Dockerfile
    │   │   └── backend.Dockerfile
    │   └── prod/
    │       ├── compose.yml         prod-оверрайд (Let's Encrypt, restart:always)
    │       ├── frontend.Dockerfile
    │       └── backend.Dockerfile
    └── traefik/              статические и динамические конфиги
```

## Переменные окружения

Все переменные — в одном `.env` в корне. Docker Compose подгружает его и
пробрасывает нужные значения в каждый сервис (см. `environment:` в
`infra/docker/compose.base.yml`). Публичные переменные Nuxt именуются с
префиксом `NUXT_PUBLIC_*` и автоматически становятся доступны в браузере.

## Быстрый старт

```bash
# 1. Подготовка окружения
make init                    # cp .env.example .env
# отредактируй .env: сгенерируй секреты Strapi, задай пароль Postgres

# 2. Сгенерировать проекты (один раз)
npx nuxi@latest init apps/frontend
npx create-strapi@latest apps/backend --quickstart --no-run --dbclient=postgres

# 3. Поднять dev-стек
make dev
# → http://app.localhost         — Nuxt
# → http://api.localhost         — Strapi
# → http://traefik.localhost     — дашборд Traefik
# → http://localhost:8080        — прямой доступ к дашборду

# 4. Prod
NODE_ENV=production make prod
```

Для `*.localhost` в macOS/Linux ничего настраивать не нужно (резолвится в 127.0.0.1).
На Windows — добавить записи в `hosts` или использовать `dnsmasq`.

## Мобильная сборка

Capacitor 8 подключён, конфиг в `apps/frontend/capacitor.config.ts`,
секреты — через `CAP_APP_ID`, `CAP_APP_NAME`, `CAP_SERVER_URL` в
корневом `.env`. Webroot для нативной обёртки — `.output/public/`
(`nuxt generate`).

### Android

Нативный проект уже в репо (`apps/frontend/android/`). Что нужно
локально:

- JDK 17+ (мы тестировали на 21)
- Android Studio или CLI Android SDK (`ANDROID_HOME`)
- Workflow:
  ```bash
  cd apps/frontend
  npm run cap:sync         # nuxt generate + cap copy + sync plugins
  npm run cap:open:android # открыть в Android Studio
  ```

### iOS

Нативный проект **не сгенерирован** в репо: `cap add ios` требует
macOS + Xcode (CocoaPods), которых нет в Linux-окружении сборки.
Сгенерировать локально на Mac разработчика:

```bash
cd apps/frontend
npm run cap:add:ios       # один раз
npm run cap:sync
npm run cap:open:ios
```

После генерации директорию `apps/frontend/ios/` рекомендуется
закоммитить (ignore-листы внутри уже выставлены Capacitor'ом).

### Live reload на устройстве

Задать `CAP_SERVER_URL=http://<LAN-IP>:3000` в корневом `.env`,
запустить `make dev` (Nuxt будет слушать на 0.0.0.0), затем
`npm run cap:sync` и открыть приложение на устройстве — оно загрузит
страницы с dev-сервера с горячей перезагрузкой.

## PWA

`@vite-pwa/nuxt` подключён. Иконки сгенерированы из
`apps/frontend/public/logo.svg` через `@vite-pwa/assets-generator`
(конфиг — `pwa-assets.config.ts`). Перегенерация:

```bash
cd apps/frontend && npx pwa-assets-generator
```

Стратегия service worker'а — `autoUpdate`, для `/api/*` принудительно
`NetworkOnly` (токены и сессии не должны кешироваться).

Оба мобильных клиента и PWA обращаются к тому же `api.<domain>` через
HTTPS в проде. На login/register/refresh клиент шлёт стабильный
per-install `deviceId` (UUID); это ключ дедупа сессий на бэке.

## Авторизация

Реализована на refresh-токенах с поддержкой сессий устройств:

- Бэк: `users-permissions` в `jwtManagement: 'refresh'` + сайдкар
  `Session` (см. `apps/backend/src/api/session/`). Дедуп по `(user,
  deviceId)`, partial unique index в Postgres, reuse-detection.
- Фронт: Pinia-стор `useAuthStore` (`apps/frontend/app/stores/auth.ts`)
  + плагин `$api` с авто-рефрешем на 401 в single-flight.
- Web → refresh в HttpOnly+Secure-cookie (заголовок
  `x-strapi-refresh-cookie: httpOnly`), access в памяти.
- Mobile → refresh в Keychain (iOS) / EncryptedSharedPreferences
  (Android) через `@aparajita/capacitor-secure-storage`, access в
  памяти. Несекретные ключи (deviceId) — в Capacitor Preferences.
  Файл `app/utils/storage.ts` разделяет эти два слоя.
- Управление сессиями: `/api/auth/sessions` (GET/DELETE/revoke-others),
  UI в `apps/frontend/app/pages/sessions.vue`.

## Дальнейшие шаги

- [ ] `make init` и заполнить секреты в `.env`
- [ ] Настроить DNS `A`-записи для `APP_DOMAIN` / `API_DOMAIN` / `TRAEFIK_DOMAIN`
      на prod-сервер (для Let's Encrypt)
- [ ] На Mac разработчика — `npm run cap:add:ios`, закоммитить
      `apps/frontend/ios/`
- [ ] Прогнать `make dev` и end-to-end сценарии auth (см. план в
      `/root/.claude/plans/floofy-hatching-owl.md`, секция «Сценарий
      проверки»)

## Команды

| Команда          | Что делает                                      |
|------------------|-------------------------------------------------|
| `make init`      | создать `.env` из примера                        |
| `make dev`       | поднять dev-стек (hot reload)                    |
| `make prod`      | поднять prod-стек (Let's Encrypt)                |
| `make down`      | остановить                                       |
| `make logs`      | tail всех логов                                  |
| `make ps`        | статус контейнеров                               |
| `make sh-<svc>`  | shell в контейнер (frontend/backend/postgres)   |
| `make clean`     | удалить контейнеры и тома (данные потеряются)   |
