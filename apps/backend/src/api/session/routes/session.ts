/**
 * Маршруты управления сессиями устройств. Plain object — НЕ
 * createCoreRouter, чтобы не плодить лишних CRUD-эндпоинтов на сайдкар.
 *
 * Все три роута требуют валидный access-токен (Bearer). Стратегия
 * users-permissions сама бросает 401 при отсутствии auth (т.к. у роута
 * нет публичного скоупа), а полиси is-authenticated дополнительно
 * извлекает sessionId из payload и кладёт в ctx.state.session.
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/auth/sessions',
      handler: 'api::session.session.list',
      config: {
        policies: ['api::session.is-authenticated'],
      },
    },
    {
      method: 'DELETE',
      path: '/auth/sessions/:id',
      handler: 'api::session.session.revoke',
      config: {
        policies: ['api::session.is-authenticated'],
      },
    },
    {
      method: 'POST',
      path: '/auth/sessions/revoke-others',
      handler: 'api::session.session.revokeOthers',
      config: {
        policies: ['api::session.is-authenticated'],
      },
    },
  ],
};
