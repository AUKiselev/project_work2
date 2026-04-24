/**
 * Кастомные действия управления сессиями устройств.
 *   GET    /api/auth/sessions                — список активных сессий пользователя
 *   DELETE /api/auth/sessions/:id            — завершить одну (по documentId)
 *   POST   /api/auth/sessions/revoke-others  — завершить все, кроме текущей
 *
 * Авторизация и извлечение currentSessionId — в полиси is-authenticated.
 * Всегда фильтруем по ctx.state.user.id, никаких user-параметров из запроса.
 */
import type { Core } from '@strapi/strapi';

const sanitize = (row: any) => ({
  id: row?.id,
  documentId: row?.documentId,
  deviceId: row?.deviceId,
  name: row?.name,
  platform: row?.platform,
  ipAddress: row?.ipAddress,
  lastActiveAt: row?.lastActiveAt,
  createdAt: row?.createdAt,
  current: row?.__current === true || undefined,
});

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(ctx: any) {
    const userId = ctx.state.user.id;
    const currentSessionId = ctx.state.session?.id;
    const rows = await (strapi.service('api::session.session') as any).listForUser(userId);
    const data = (rows || []).map((r: any) => {
      if (currentSessionId && r.sessionId === currentSessionId) (r as any).__current = true;
      return sanitize(r);
    });
    ctx.body = { data };
  },

  async revoke(ctx: any) {
    const userId = ctx.state.user.id;
    const documentId = ctx.params.id;
    if (!documentId || typeof documentId !== 'string') {
      return ctx.badRequest('Missing session id');
    }
    const result = await (strapi.service('api::session.session') as any).revokeOne(userId, documentId);
    if (!result) return ctx.notFound('Session not found');
    ctx.body = { data: sanitize(result) };
  },

  async revokeOthers(ctx: any) {
    const userId = ctx.state.user.id;
    const currentSessionId = ctx.state.session?.id;
    if (!currentSessionId) return ctx.unauthorized('Missing session id in access token');
    const revoked = await (strapi.service('api::session.session') as any).revokeOthers(
      userId,
      currentSessionId
    );
    ctx.body = { data: { revoked } };
  },
});
