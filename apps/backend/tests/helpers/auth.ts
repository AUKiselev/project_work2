import type { Core } from '@strapi/strapi';

/**
 * Создаёт полноценный access-токен для пользователя через sessionManager
 * (режим refresh). Токен содержит `type: 'access'` и `sessionId`,
 * что требуется политикой `api::session.is-authenticated`.
 *
 * Используйте только в интеграционных тестах.
 */
export const issueAccessToken = async (
  strapi: Core.Strapi,
  userId: number,
): Promise<string> => {
  const sm = (strapi as any).sessionManager('users-permissions');
  const deviceId = `test-device-${userId}-${Date.now()}`;
  const refresh = await sm.generateRefreshToken(String(userId), deviceId, {
    userAgent: 'jest-test',
    ipAddress: '127.0.0.1',
  });
  const access = await sm.generateAccessToken(refresh.token);
  return access.token as string;
};
