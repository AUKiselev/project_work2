import type { Core } from '@strapi/strapi';

const SESSION_ACTIONS = [
  'api::session.session.list',
  'api::session.session.revoke',
  'api::session.session.revokeOthers',
] as const;

/**
 * Идемпотентно выдаёт Authenticated-роли разрешения на действия
 * /api/auth/sessions/*. Без этих записей в users-permissions strategy
 * вернёт 401/403 даже при валидном access-токене.
 */
const grantSessionPermissionsToAuthenticated = async (strapi: Core.Strapi) => {
  const role: any = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } });
  if (!role) {
    strapi.log.warn('users-permissions: authenticated role not found, skipping session permissions');
    return;
  }
  for (const action of SESSION_ACTIONS) {
    const existing = await strapi.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { role: role.id, action } });
    if (existing) continue;
    await strapi.db
      .query('plugin::users-permissions.permission')
      .create({ data: { role: role.id, action } });
    strapi.log.info(`users-permissions: granted ${action} to authenticated role`);
  }
};

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grantSessionPermissionsToAuthenticated(strapi);
  },
};
