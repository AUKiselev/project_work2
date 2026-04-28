import { factories } from '@strapi/strapi';

const stripQrFromList = (rows: any[]) =>
  (rows || []).map((r) => ({ ...r, qrPayload: undefined }));

export default factories.createCoreController('api::ticket.ticket', ({ strapi }) => ({
  async findMine(ctx: any) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();

    const tickets = await strapi.db.query('api::ticket.ticket').findMany({
      where: { order: { user: userId } },
      populate: {
        event: { populate: { coverImage: true, venue: true } },
        tier: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const stripped = stripQrFromList(tickets);
    const sanitized = await this.sanitizeOutput(stripped, ctx);
    ctx.body = { data: sanitized };
  },

  async findOneMine(ctx: any) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();
    const id = Number(ctx.params.id);

    const ticket: any = await strapi.db.query('api::ticket.ticket').findOne({
      where: { id, order: { user: userId } },
      populate: {
        event: { populate: { coverImage: true, venue: true, organizer: { populate: { logo: true } } } },
        tier: true,
        attendee: true,
      },
    });
    if (!ticket) return ctx.notFound();

    ctx.body = {
      data: {
        id: ticket.id,
        documentId: ticket.documentId,
        number: ticket.number,
        status: ticket.status,
        usedAt: ticket.usedAt,
        qrPayload: ticket.qrPayload,
        attendee: ticket.attendee,
        event: ticket.event,
        tier: ticket.tier,
      },
    };
  },
}));
