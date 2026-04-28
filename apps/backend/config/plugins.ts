import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  'users-permissions': {
    config: {
      // Включает SessionManager и эндпоинты /auth/refresh, /auth/logout.
      jwtManagement: 'refresh',
      jwt: {
        expiresIn: `${env.int('UP_ACCESS_TOKEN_LIFESPAN', 600)}s`,
      },
      // Разрешаем клиенту слать deviceId/deviceName при регистрации,
      // чтобы расширение могло сразу же завести сайдкар-строку Session.
      register: {
        allowedFields: ['deviceId', 'deviceName'],
      },
      sessions: {
        // httpOnly: true заставит cookie-режим даже без заголовка. Оставляем
        // false — пусть клиент выбирает через `x-strapi-refresh-cookie: httpOnly`.
        httpOnly: false,
        accessTokenLifespan: env.int('UP_ACCESS_TOKEN_LIFESPAN', 600),
        idleRefreshTokenLifespan: env.int('UP_REFRESH_IDLE_LIFESPAN', 60 * 60 * 24 * 14),
        maxRefreshTokenLifespan: env.int('UP_REFRESH_MAX_LIFESPAN', 60 * 60 * 24 * 30),
        cookie: {
          name: env('UP_REFRESH_COOKIE_NAME', 'strapi_up_refresh'),
          domain: env('UP_REFRESH_COOKIE_DOMAIN') || undefined,
          sameSite: env('UP_REFRESH_COOKIE_SAMESITE', 'lax'),
          secure: env.bool('UP_REFRESH_COOKIE_SECURE', true),
          path: '/',
        },
      },
      ratelimit: {
        enabled: true,
        interval: env.int('UP_RATELIMIT_INTERVAL', 60_000),
        max: env.int('UP_RATELIMIT_MAX', 5),
      },
    },
  },
});

export default config;
