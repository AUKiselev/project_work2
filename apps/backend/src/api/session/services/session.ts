/**
 * Session service — единая точка работы с сайдкаром Session.
 *
 * Используется и кастомным контроллером (`/api/auth/sessions/*`), и
 * расширением users-permissions, которое оборачивает callback/refresh/logout.
 *
 * Стабильный ключ корреляции — `(user, deviceId, revokedAt IS NULL)`.
 * `sessionId` — мутируемый указатель, ротируется при каждом
 * `rotateRefreshToken` в SessionManager.
 */

import type { Core } from '@strapi/strapi';

const SESSION_UID = 'api::session.session' as const;

type Platform = 'web' | 'ios' | 'android' | 'unknown';

interface DeviceMeta {
  name: string;
  platform: Platform;
  userAgent: string;
  ipAddress: string;
}

interface UpsertParams {
  userId: number | string;
  deviceId: string;
  sessionId: string;
  meta: DeviceMeta;
}

const parseUserAgent = (ua: string | undefined, deviceNameOverride?: string): { name: string; platform: Platform } => {
  const safeUa = (ua || '').slice(0, 512);
  if (deviceNameOverride && typeof deviceNameOverride === 'string') {
    return { name: deviceNameOverride.slice(0, 128), platform: detectPlatform(safeUa) };
  }
  const platform = detectPlatform(safeUa);
  const browser = detectBrowser(safeUa);
  const os = detectOS(safeUa);
  const name = browser && os ? `${browser} on ${os}` : browser || os || 'Unknown device';
  return { name: name.slice(0, 128), platform };
};

const detectPlatform = (ua: string): Platform => {
  if (/CapacitorIOS|iPhone|iPad|iOS/i.test(ua)) return 'ios';
  if (/CapacitorAndroid|Android/i.test(ua)) return 'android';
  if (/Mozilla|Chrome|Safari|Firefox|Edge/i.test(ua)) return 'web';
  return 'unknown';
};

const detectBrowser = (ua: string): string => {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return 'Chrome';
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  return '';
};

const detectOS = (ua: string): string => {
  if (/Windows NT/i.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iOS/i.test(ua)) return 'iOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return '';
};

const extractDeviceMeta = (ctx: any, deviceNameOverride?: string): DeviceMeta => {
  const ua = ctx.request?.header?.['user-agent'] as string | undefined;
  const ip = (ctx.request?.ip as string | undefined) || '';
  const { name, platform } = parseUserAgent(ua, deviceNameOverride);
  return {
    name,
    platform,
    userAgent: (ua || '').slice(0, 1024),
    ipAddress: ip.slice(0, 64),
  };
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  parseUserAgent,
  extractDeviceMeta,

  /**
   * Найти активную сессию по (user, deviceId).
   */
  async findActiveByDevice(userId: number | string, deviceId: string) {
    const rows = await strapi.documents(SESSION_UID).findMany({
      filters: {
        user: { id: { $eq: userId } } as any,
        deviceId: { $eq: deviceId },
        revokedAt: { $null: true },
      } as any,
      limit: 1,
    } as any);
    return rows?.[0] || null;
  },

  /**
   * Найти активную сессию по текущему sessionId (используется на refresh,
   * чтобы обновить указатель после ротации).
   */
  async findActiveBySessionId(sessionId: string) {
    const rows = await strapi.documents(SESSION_UID).findMany({
      filters: {
        sessionId: { $eq: sessionId },
        revokedAt: { $null: true },
      } as any,
      limit: 1,
      populate: { user: true } as any,
    } as any);
    return rows?.[0] || null;
  },

  /**
   * Дедуп-апсерт. Должен вызываться внутри транзакции вместе с
   * SessionManager.invalidateRefreshToken(userId, deviceId).
   */
  async upsertByDevice({ userId, deviceId, sessionId, meta }: UpsertParams) {
    const existing = await this.findActiveByDevice(userId, deviceId);
    const now = new Date().toISOString();
    if (existing) {
      return strapi.documents(SESSION_UID).update({
        documentId: (existing as any).documentId,
        data: {
          sessionId,
          name: meta.name,
          userAgent: meta.userAgent,
          ipAddress: meta.ipAddress,
          platform: meta.platform,
          lastActiveAt: now,
          revokedAt: null,
        } as any,
      } as any);
    }
    return strapi.documents(SESSION_UID).create({
      data: {
        user: userId as any,
        deviceId,
        sessionId,
        name: meta.name,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        platform: meta.platform,
        lastActiveAt: now,
      } as any,
    } as any);
  },

  /**
   * Обновляет указатель sessionId и lastActiveAt после ротации.
   */
  async updateOnRotate(oldSessionId: string, newSessionId: string) {
    const row = await this.findActiveBySessionId(oldSessionId);
    if (!row) return null;
    return strapi.documents(SESSION_UID).update({
      documentId: (row as any).documentId,
      data: {
        sessionId: newSessionId,
        lastActiveAt: new Date().toISOString(),
      } as any,
    } as any);
  },

  /**
   * Помечает запись revoked + просит SessionManager инвалидировать
   * refresh-токен по (userId, deviceId).
   */
  async revokeRow(row: any) {
    if (!row || row.revokedAt) return row;
    try {
      await strapi
        .sessionManager('users-permissions')
        .invalidateRefreshToken(String(row.user?.id || row.userId), row.deviceId);
    } catch (err) {
      strapi.log.error('SessionManager.invalidateRefreshToken failed', err as Error);
    }
    return strapi.documents(SESSION_UID).update({
      documentId: row.documentId,
      data: { revokedAt: new Date().toISOString() } as any,
    } as any);
  },

  /**
   * Reuse-detection: пришёл невалидный refresh — гасим строку, если
   * нашлась по старому sessionId (декодируется до вызова rotate).
   */
  async revokeBySessionIdIfActive(sessionId: string) {
    const row = await this.findActiveBySessionId(sessionId);
    if (!row) return null;
    return this.revokeRow(row);
  },

  /**
   * Логаут: помечает строки как revoked. Если deviceId передан —
   * только эту, иначе все активные у пользователя. Инвалидация в
   * SessionManager уже сделана оригинальным контроллером.
   */
  async markLogout(userId: number | string, deviceId?: string) {
    const filters: any = {
      user: { id: { $eq: userId } },
      revokedAt: { $null: true },
    };
    if (deviceId) filters.deviceId = { $eq: deviceId };
    const rows = await strapi.documents(SESSION_UID).findMany({ filters, limit: 1000 } as any);
    const now = new Date().toISOString();
    await Promise.all(
      (rows || []).map((r: any) =>
        strapi.documents(SESSION_UID).update({
          documentId: r.documentId,
          data: { revokedAt: now } as any,
        } as any)
      )
    );
    return rows?.length || 0;
  },

  /**
   * Список активных сессий пользователя — для GET /auth/sessions.
   */
  async listForUser(userId: number | string) {
    return strapi.documents(SESSION_UID).findMany({
      filters: {
        user: { id: { $eq: userId } } as any,
        revokedAt: { $null: true },
      } as any,
      sort: { lastActiveAt: 'desc' } as any,
      limit: 1000,
    } as any);
  },

  /**
   * Завершить одну сессию по documentId. Проверяет владельца.
   */
  async revokeOne(userId: number | string, documentId: string) {
    const row: any = await strapi.documents(SESSION_UID).findOne({
      documentId,
      populate: { user: true } as any,
    } as any);
    if (!row || String(row.user?.id) !== String(userId)) return null;
    if (row.revokedAt) return row;
    return this.revokeRow(row);
  },

  /**
   * Завершить все сессии пользователя, кроме той, чей sessionId
   * равен currentSessionId (берётся из payload текущего access-токена).
   */
  async revokeOthers(userId: number | string, currentSessionId: string) {
    const rows = await this.listForUser(userId);
    const others = (rows || []).filter((r: any) => r.sessionId !== currentSessionId);
    await Promise.all(others.map((r: any) => this.revokeRow(r)));
    return others.length;
  },
});
