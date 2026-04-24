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

1. В `apps/frontend`: `npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/ios @capacitor/android`
2. `npx cap init "$CAP_APP_NAME" "$CAP_APP_ID"` (значения из `.env`)
3. Nuxt собрать статикой: `npm run generate` → `dist/`
4. `npx cap add ios && npx cap add android`
5. `npx cap sync`
6. В `capacitor.config.ts` для dev выставить `server.url = CAP_SERVER_URL` (LAN IP
   dev-сервера Nuxt), в prod — оставить пустым, будет использоваться бандл.

Оба мобильных клиента обращаются к тому же `api.<domain>` через HTTPS в проде.

## Дальнейшие шаги

- [ ] `make init` и заполнить секреты в `.env`
- [ ] Сгенерировать Nuxt в `apps/frontend` (с compatibility version 4)
- [ ] Сгенерировать Strapi в `apps/backend` с клиентом `postgres`
- [ ] Добавить Capacitor во frontend (`npm i -D @capacitor/cli`)
- [ ] Настроить DNS `A`-записи для `APP_DOMAIN` / `API_DOMAIN` / `TRAEFIK_DOMAIN`
      на prod-сервер (для Let's Encrypt)
- [ ] Проверить `make dev` → `make prod` на тестовом домене

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
