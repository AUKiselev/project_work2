import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::event.event', ({ strapi }) => ({
  async search(ctx: any) {
    const q = String(ctx.query.q || '').trim();
    if (!q) {
      ctx.body = { data: [] };
      return;
    }
    // Используем Document Service (не strapi.db.query) чтобы sanitizeOutput
    // корректно обрабатывал relations в document-формате Strapi 5.
    const results = await strapi.documents('api::event.event').findMany({
      filters: {
        status: 'published',
        title: { $containsi: q },
      },
      populate: { coverImage: true, venue: true, tiers: true, category: true },
      sort: { startsAt: 'asc' },
      limit: 50,
      status: 'published',
    });
    const sanitized = await this.sanitizeOutput(results, ctx);
    ctx.body = { data: sanitized };
  },

  async findBySlug(ctx: any) {
    const slug = String(ctx.params.slug);
    // Document Service корректно обрабатывается sanitizeOutput в Strapi 5.
    // strapi.db.query возвращает entity-формат без documentId, что ломает sanitize.
    const event = await strapi.documents('api::event.event').findFirst({
      filters: { slug },
      populate: {
        coverImage: true,
        gallery: true,
        pastGallery: true,
        venue: true,
        organizer: { populate: { logo: true } },
        agenda: { populate: { speakers: { populate: { photo: true } } } },
        speakers: { populate: { photo: true } },
        tiers: true,
        category: true,
      },
      status: 'published',
    });
    if (!event) return ctx.notFound();
    const sanitized = await this.sanitizeOutput(event, ctx);
    ctx.body = { data: sanitized };
  },
}));
