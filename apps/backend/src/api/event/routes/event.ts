// Намеренно НЕ используем config: { auth: false }.
// При auth: false Strapi пропускает middleware аутентификации,
// ctx.state.auth остаётся undefined, и sanitizeOutput срезает
// все relation-поля (speakers, venue, tiers, organizer) даже если
// у public-роли есть разрешения на find.
// Без явного auth Strapi запускает authenticate(), который строит
// CASL ability из public-permissions, и sanitizeOutput корректно
// пропускает relation-поля на которые есть доступ.
export default {
  routes: [
    {
      method: 'GET',
      path: '/events/search',
      handler: 'api::event.event.search',
    },
    {
      method: 'GET',
      path: '/events/by-slug/:slug',
      handler: 'api::event.event.findBySlug',
    },
    {
      method: 'GET',
      path: '/events',
      handler: 'api::event.event.find',
    },
    {
      method: 'GET',
      path: '/events/:slug/availability',
      handler: 'api::event.event.availability',
    },
    {
      method: 'GET',
      path: '/events/:id',
      handler: 'api::event.event.findOne',
    },
  ],
};
