export default {
  routes: [
    {
      method: 'GET',
      path: '/events/search',
      handler: 'api::event.event.search',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/events/by-slug/:slug',
      handler: 'api::event.event.findBySlug',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/events',
      handler: 'api::event.event.find',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/events/:id',
      handler: 'api::event.event.findOne',
      config: { auth: false },
    },
  ],
};
