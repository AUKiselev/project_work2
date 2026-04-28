import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::favorite.favorite', ({ strapi }) => ({
  async addFavorite(ctx: any) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();
    const eventId = Number(ctx.request.body?.eventId);
    if (!eventId) return ctx.badRequest('eventId required');

    const event = await strapi.db.query('api::event.event').findOne({ where: { id: eventId } });
    if (!event) return ctx.notFound();

    const existing = await strapi.db.query('api::favorite.favorite').findOne({
      where: { user: userId, event: eventId },
    });
    if (existing) {
      ctx.body = { data: existing, alreadyExisted: true };
      return;
    }

    const created = await strapi.db.query('api::favorite.favorite').create({
      data: { user: userId, event: eventId },
    });
    ctx.status = 201;
    ctx.body = { data: created, alreadyExisted: false };
  },

  async removeFavorite(ctx: any) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();
    const eventId = Number(ctx.params.eventId);

    const existing = await strapi.db.query('api::favorite.favorite').findOne({
      where: { user: userId, event: eventId },
    });
    if (!existing) return ctx.notFound();

    await strapi.db.query('api::favorite.favorite').delete({ where: { id: existing.id } });
    ctx.status = 204;
  },

  async findMine(ctx: any) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();

    const rows = await strapi.db.query('api::favorite.favorite').findMany({
      where: { user: userId },
      populate: { event: { populate: { coverImage: true, tiers: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const sanitized = await this.sanitizeOutput(rows, ctx);
    ctx.body = { data: sanitized };
  },
}));
