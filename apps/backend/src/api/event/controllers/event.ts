import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::event.event', ({ strapi }) => ({
  async search(ctx: any) {
    const q = String(ctx.query.q || '').trim();
    if (!q) {
      ctx.body = { data: [] };
      return;
    }
    const rows = await strapi.db.query('api::event.event').findMany({
      where: {
        publishedAt: { $notNull: true },
        status: 'published',
        title: { $containsi: q },
      },
      populate: { coverImage: true, venue: true, tiers: true },
      orderBy: { startsAt: 'asc' },
      limit: 50,
    });
    const sanitized = await this.sanitizeOutput(rows, ctx);
    ctx.body = { data: sanitized };
  },

  async findBySlug(ctx: any) {
    const slug = String(ctx.params.slug);
    const event = await strapi.db.query('api::event.event').findOne({
      where: { slug, publishedAt: { $notNull: true }, status: 'published' },
      populate: {
        coverImage: true,
        gallery: true,
        pastGallery: true,
        venue: true,
        organizer: { populate: { logo: true } },
        agenda: { populate: { speakers: { populate: { photo: true } } } },
        speakers: { populate: { photo: true } },
        tiers: true,
      },
    });
    if (!event) return ctx.notFound();
    const sanitized = await this.sanitizeOutput(event, ctx);
    ctx.body = { data: sanitized };
  },
}));
