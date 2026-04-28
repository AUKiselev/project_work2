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

Capacitor уже подключён (`apps/frontend/capacitor.config.ts` + пакеты
@capacitor/core, @capacitor/cli, @capacitor/ios, @capacitor/android,
@capacitor/preferences). Шаги:

1. Один раз сгенерировать нативные проекты:
   `cd apps/frontend && npm run cap:add:ios && npm run cap:add:android`
2. Собрать статикой и синхронизировать: `npm run cap:sync`
3. Открыть в нативной IDE: `npm run cap:open:ios` / `cap:open:android`

Для dev с горячей перезагрузкой на устройстве — задать `CAP_SERVER_URL`
в корневом `.env` (LAN IP машины, где запущен `nuxt dev`).

⚠ refresh-токен на native сейчас лежит в `Capacitor Preferences` — это
**не** secure storage. Для прода переехать на Keychain/Keystore
(например, `@aparajita/capacitor-secure-storage`); точка замены —
`apps/frontend/app/utils/storage.ts`.

## PWA

`@vite-pwa/nuxt` подключён, манифест в `nuxt.config.ts`. Иконки
`/icon-192.png` и `/icon-512.png` нужно положить в `apps/frontend/public/`
перед прод-сборкой (можно сгенерировать `@vite-pwa/assets-generator`
из одного исходного svg/png).

Оба мобильных клиента обращаются к тому же `api.<domain>` через HTTPS в
проде. На login/register/refresh клиент шлёт стабильный per-install
`deviceId` (UUID, лежит в Capacitor Preferences/localStorage); это ключ
дедупа сессий на бэке.

## Авторизация

Реализована на refresh-токенах с поддержкой сессий устройств:

- Бэк: `users-permissions` в `jwtManagement: 'refresh'` + сайдкар
  `Session` (см. `apps/backend/src/api/session/`). Дедуп по `(user,
  deviceId)`, partial unique index в Postgres, reuse-detection.
- Фронт: Pinia-стор `useAuthStore` (`apps/frontend/app/stores/auth.ts`)
  + плагин `$api` с авто-рефрешем на 401 в single-flight.
- Web → refresh в HttpOnly+Secure-cookie (заголовок
  `x-strapi-refresh-cookie: httpOnly`), access в памяти.
- Mobile → refresh bearer в Capacitor Preferences (точка замены на
  Keychain/Keystore — `app/utils/storage.ts`), access в памяти.
- Управление сессиями: `/api/auth/sessions` (GET/DELETE/revoke-others),
  UI в `apps/frontend/app/pages/sessions.vue`.

## Дальнейшие шаги

- [ ] `make init` и заполнить секреты в `.env`
- [ ] Настроить DNS `A`-записи для `APP_DOMAIN` / `API_DOMAIN` / `TRAEFIK_DOMAIN`
      на prod-сервер (для Let's Encrypt)
- [ ] Сгенерировать иконки PWA (`@vite-pwa/assets-generator`) и положить
      в `apps/frontend/public/`
- [ ] Сгенерировать iOS/Android-обёртки (`npm run cap:add:ios|android`)
      и опубликовать
- [ ] Заменить `Capacitor Preferences` на secure storage для нативного
      refresh-токена

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
