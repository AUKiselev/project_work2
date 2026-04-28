import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::banner.banner', ({ strapi }) => ({
  async find(ctx: any) {
    const now = new Date();
    const rows = await strapi.db.query('api::banner.banner').findMany({
      where: {
        publishedAt: { $notNull: true },
        $and: [
          { $or: [{ activeFrom: { $null: true } }, { activeFrom: { $lte: now } }] },
          { $or: [{ activeUntil: { $null: true } }, { activeUntil: { $gte: now } }] },
        ],
      },
      populate: { image: true, event: true },
      orderBy: { priority: 'desc' },
    });
    const sanitized = await this.sanitizeOutput(rows, ctx);
    ctx.body = { data: sanitized };
  },
}));
