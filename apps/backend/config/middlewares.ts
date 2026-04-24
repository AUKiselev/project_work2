import type { Core } from '@strapi/strapi';

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
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
