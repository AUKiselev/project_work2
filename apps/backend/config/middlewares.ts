import type { Core } from '@strapi/strapi';

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      // Разрешённые Origin берём из WEB_ORIGINS (csv). Если переменная пуста —
      // оставляем дефолт '*' (полезно при первом запуске без .env).
      // Кастомный заголовок x-strapi-refresh-cookie нужен фронту,
      // чтобы переключать транспорт refresh-токена в HttpOnly cookie.
      origin: (() => {
        const list = (process.env.WEB_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
        return list.length ? list : '*';
      })(),
      credentials: true,
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Strapi-Refresh-Cookie'],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  // CSRF для cookie-пути на /auth/refresh и /auth/logout. Должен идти
  // после strapi::body, чтобы успели спарситься куки и заголовки.
  'global::csrf-cookie-origin',
];

export default config;
