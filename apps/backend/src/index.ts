import type { Core } from '@strapi/strapi';

const PUBLIC_ACTIONS = [
  'api::event.event.find',
  'api::event.event.findOne',
  'api::event.event.search',
  'api::event.event.findBySlug',
  'api::speaker.speaker.find',
  'api::speaker.speaker.findOne',
  'api::organizer.organizer.find',
  'api::organizer.organizer.findOne',
  'api::banner.banner.find',
  'api::speaker-application.speaker-application.create',
  'api::manager-contact-request.manager-contact-request.create',
] as const;

const AUTHENTICATED_ACTIONS = [
  ...PUBLIC_ACTIONS,
  'api::session.session.list',
  'api::session.session.revoke',
  'api::session.session.revokeOthers',
  'api::favorite.favorite.addFavorite',
  'api::favorite.favorite.removeFavorite',
  'api::favorite.favorite.findMine',
  'api::order.order.create',
  'api::order.order.previewPromo',
  'api::order.order.markPaid',
  'api::order.order.findMine',
  'api::order.order.findOneMine',
  'api::ticket.ticket.findMine',
  'api::ticket.ticket.findOneMine',
] as const;

const grantPermissions = async (
  strapi: Core.Strapi,
  roleType: 'public' | 'authenticated',
  actions: readonly string[],
) => {
  const role: any = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: roleType } });
  if (!role) {
    strapi.log.warn(`users-permissions: role ${roleType} not found, skipping`);
    return;
  }
  for (const action of actions) {
    const existing = await strapi.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { role: role.id, action } });
    if (existing) continue;
    await strapi.db
      .query('plugin::users-permissions.permission')
      .create({ data: { role: role.id, action } });
    strapi.log.info(`users-permissions: granted ${action} to ${roleType}`);
  }
};

const assertRequiredEnv = () => {
  if (!process.env.TICKET_QR_SECRET || process.env.TICKET_QR_SECRET.length < 16) {
    throw new Error(
      'TICKET_QR_SECRET env is required (min length 16). Set it in apps/backend/.env',
    );
  }
};

const bootstrapEnabled = (): boolean => {
  const v = process.env.BOOTSTRAP_PERMISSIONS;
  if (v === undefined) return process.env.NODE_ENV !== 'production';
  return v === 'true';
};

export default {
  register() {
    assertRequiredEnv();
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    if (!bootstrapEnabled()) {
      strapi.log.info('bootstrap permissions: disabled by BOOTSTRAP_PERMISSIONS');
      return;
    }
    await grantPermissions(strapi, 'public', PUBLIC_ACTIONS);
    await grantPermissions(strapi, 'authenticated', AUTHENTICATED_ACTIONS);

    if (process.env.SEED_DEV === 'true') {
      const { seedDev } = await import('./seed/dev-seed');
      await seedDev(strapi);
    }
  },
};
