/**
 * Расширение users-permissions: оборачивает callback/refresh/logout, чтобы
 * вести сайдкар-запись Session с дедупом по (user, deviceId).
 *
 * Поток login (mode=refresh, провайдер local):
 *  1. Достаём deviceId из body. Если его нет — 400.
 *  2. Идентифицируем пользователя по identifier (без проверки пароля) и,
 *     если найден, инвалидируем старую SM-запись для (user, deviceId)
 *     ДО оригинального обработчика. Это гарантирует, что после
 *     `generateRefreshToken` в SM останется ровно одна запись на устройство.
 *  3. Запускаем оригинальный callback — он валидирует пароль и создаёт
 *     новые refresh/access.
 *  4. Из access-токена достаём sessionId и upsert-им строку Session.
 *
 * Поток refresh:
 *  1. Достаём old refresh-токен (cookie или body), декодируем sessionId
 *     ДО ротации.
 *  2. Запускаем оригинальный refresh.
 *  3. Если успех — обновляем sessionId/lastActiveAt в сайдкаре по oldSessionId.
 *  4. Если 401 — инвалидируем строку по oldSessionId (reuse-detection).
 *
 * Поток logout: оригинальный обработчик уже инвалидирует SM-запись.
 * Здесь просто помечаем сайдкар revoked (одну строку, если deviceId
 * передан, иначе все активные у пользователя).
 */
type Strapi = any;

const extractDeviceId = (body: any): string | undefined => {
  const v = body?.deviceId;
  return typeof v === 'string' && v.length > 0 ? v.slice(0, 128) : undefined;
};

const extractDeviceName = (body: any): string | undefined => {
  const v = body?.deviceName;
  return typeof v === 'string' && v.length > 0 ? v.slice(0, 128) : undefined;
};

const getMode = (strapi: Strapi): string =>
  strapi.config.get('plugin::users-permissions.jwtManagement', 'legacy-support');

const getSidecar = (strapi: Strapi) => strapi.service('api::session.session');

const sessionIdFromAccessToken = (strapi: Strapi, accessToken: string): string | undefined => {
  if (!accessToken) return undefined;
  const result = strapi.sessionManager('users-permissions').validateAccessToken(accessToken);
  if (!result.isValid || result.payload?.type !== 'access') return undefined;
  return result.payload.sessionId as string;
};

const sessionIdFromRefreshToken = async (
  strapi: Strapi,
  refreshToken: string
): Promise<string | undefined> => {
  if (!refreshToken) return undefined;
  try {
    const result = await strapi
      .sessionManager('users-permissions')
      .validateRefreshToken(refreshToken);
    if (!result.isValid) return undefined;
    return result.sessionId as string;
  } catch {
    return undefined;
  }
};

const findUserByIdentifier = async (strapi: Strapi, identifier: unknown) => {
  if (!identifier || typeof identifier !== 'string') return null;
  return strapi.db.query('plugin::users-permissions.user').findOne({
    where: {
      provider: 'local',
      $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
    },
  });
};

export default (plugin: any) => {
  const originalCallback = plugin.controllers.auth.callback;
  const originalRefresh = plugin.controllers.auth.refresh;
  const originalLogout = plugin.controllers.auth.logout;

  plugin.controllers.auth.callback = async function callback(ctx: any) {
    const strapi = (globalThis as any).strapi as Strapi;
    const provider = ctx.params?.provider || 'local';
    const mode = getMode(strapi);
    const deviceId = extractDeviceId(ctx.request.body);
    const deviceName = extractDeviceName(ctx.request.body);

    // В refresh-режиме на /auth/local требуем deviceId — без него дедуп
    // по устройствам невозможен и список сессий поломан. OAuth-провайдеры
    // могут не пробросить body — для них пропускаем сайдкар.
    if (mode === 'refresh' && provider === 'local' && !deviceId) {
      return ctx.badRequest('Missing deviceId');
    }

    // Pre: убиваем старую SM-запись для (user, deviceId), пока ещё не
    // создана новая. Иначе invalidateRefreshToken после ротации удалил бы
    // обе записи (включая новую).
    if (mode === 'refresh' && provider === 'local' && deviceId) {
      const existingUser = await findUserByIdentifier(strapi, ctx.request.body?.identifier);
      if (existingUser) {
        try {
          await strapi
            .sessionManager('users-permissions')
            .invalidateRefreshToken(String(existingUser.id), deviceId);
        } catch (err) {
          strapi.log.error('pre-login invalidate failed', err as Error);
        }
      }
    }

    await originalCallback.call(this, ctx);

    if (mode !== 'refresh') return;
    if (!deviceId) return;
    const body = ctx.body as any;
    if (!body?.jwt || !body?.user?.id) return;

    const sessionId = sessionIdFromAccessToken(strapi, body.jwt);
    if (!sessionId) return;

    const sidecar = getSidecar(strapi);
    const meta = sidecar.extractDeviceMeta(ctx, deviceName);
    try {
      await sidecar.upsertByDevice({
        userId: body.user.id,
        deviceId,
        sessionId,
        meta,
      });
    } catch (err) {
      strapi.log.error('sidecar upsertByDevice failed', err as Error);
    }
  };

  plugin.controllers.auth.refresh = async function refresh(ctx: any) {
    const strapi = (globalThis as any).strapi as Strapi;
    const mode = getMode(strapi);
    if (mode !== 'refresh') return originalRefresh.call(this, ctx);

    const upSessions = strapi.config.get('plugin::users-permissions.sessions');
    const cookieName = upSessions?.cookie?.name || 'strapi_up_refresh';
    const oldRefresh: string | undefined =
      ctx.cookies.get(cookieName) || ctx.request.body?.refreshToken;
    const oldSessionId = oldRefresh
      ? await sessionIdFromRefreshToken(strapi, oldRefresh)
      : undefined;

    await originalRefresh.call(this, ctx);

    const sidecar = getSidecar(strapi);

    // Reuse-detection: оригинальный обработчик отдал 401 → строка должна
    // быть погашена.
    if (ctx.status === 401 && oldSessionId) {
      try {
        await sidecar.revokeBySessionIdIfActive(oldSessionId);
      } catch (err) {
        strapi.log.error('sidecar revoke on refresh failure failed', err as Error);
      }
      return;
    }

    const body = ctx.body as any;
    if (!body?.jwt) return;
    const newSessionId = sessionIdFromAccessToken(strapi, body.jwt);
    if (!newSessionId || !oldSessionId) return;

    try {
      await sidecar.updateOnRotate(oldSessionId, newSessionId);
    } catch (err) {
      strapi.log.error('sidecar updateOnRotate failed', err as Error);
    }
  };

  plugin.controllers.auth.logout = async function logout(ctx: any) {
    const strapi = (globalThis as any).strapi as Strapi;
    const mode = getMode(strapi);
    const deviceId = extractDeviceId(ctx.request.body);
    const userId = ctx.state?.user?.id;

    await originalLogout.call(this, ctx);

    if (mode !== 'refresh') return;
    if (!userId) return;
    if (ctx.status && ctx.status >= 400) return;

    try {
      await getSidecar(strapi).markLogout(userId, deviceId);
    } catch (err) {
      strapi.log.error('sidecar markLogout failed', err as Error);
    }
  };

  return plugin;
};
