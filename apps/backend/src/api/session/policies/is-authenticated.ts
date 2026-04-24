/**
 * Полиси для роутов /api/auth/sessions/*.
 *
 * Стратегия users-permissions уже выставляет ctx.state.user из Bearer-токена
 * и сама бросает 401, если пользователь не аутентифицирован, а роут не
 * имеет публичного скоупа. Здесь дополнительно извлекаем sessionId из
 * payload access-токена и кладём в ctx.state.session — он нужен контроллеру
 * revokeOthers, чтобы не убить текущую сессию.
 */
export default (policyContext: any, _config: unknown, { strapi }: any): boolean => {
  const ctx = policyContext;
  if (!ctx.state?.user?.id) return false;

  const authHeader: string = ctx.request?.header?.authorization || '';
  const [scheme, token] = authHeader.split(/\s+/);
  if (!token || scheme?.toLowerCase() !== 'bearer') return false;

  const result = strapi.sessionManager('users-permissions').validateAccessToken(token);
  if (!result.isValid || result.payload?.type !== 'access') return false;

  ctx.state.session = { id: result.payload.sessionId };
  return true;
};
