/**
 * CSRF-защита для cookie-пути refresh-токена.
 *
 * Срабатывает ТОЛЬКО на:
 *   POST /api/auth/refresh
 *   POST /api/auth/logout
 * и ТОЛЬКО если в запросе пришёл refresh-cookie (т.е. это web-клиент,
 * который мог быть атакован cross-site формой). Mobile-клиент с bearer-
 * токеном эту проверку проходит без участия Origin'а — bearer CSRF-иммунен.
 *
 * Сравнение по точному совпадению Origin со списком WEB_ORIGINS (CSV).
 * Если список пуст — middleware no-op (полезно для прод-конфигов, где
 * cookie-режим выключен).
 */
import type { Core } from '@strapi/strapi';

const PROTECTED_PATHS = new Set(['/api/auth/refresh', '/api/auth/logout']);

const parseAllowed = (raw: string | undefined): string[] =>
  (raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    const path = ctx.request.path;
    if (!PROTECTED_PATHS.has(path)) return next();
    if (ctx.method !== 'POST') return next();

    const upSessions = strapi.config.get<{ cookie?: { name?: string } }>(
      'plugin::users-permissions.sessions'
    );
    const cookieName = upSessions?.cookie?.name || 'strapi_up_refresh';
    const hasCookie = Boolean(ctx.cookies.get(cookieName));
    if (!hasCookie) return next();

    const allowed = parseAllowed(process.env.WEB_ORIGINS);
    if (allowed.length === 0) return next();

    const origin = ctx.request.header.origin as string | undefined;
    if (!origin || !allowed.includes(origin)) {
      return ctx.forbidden('Origin not allowed');
    }
    return next();
  };
};
