export default {
  routes: [
    {
      method: 'GET',
      path: '/me/tickets',
      handler: 'api::ticket.ticket.findMine',
      config: { policies: ['api::session.is-authenticated'] },
    },
    {
      method: 'GET',
      path: '/me/tickets/:id',
      handler: 'api::ticket.ticket.findOneMine',
      config: { policies: ['api::session.is-authenticated'] },
    },
  ],
};
