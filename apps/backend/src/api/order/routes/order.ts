export default {
  routes: [
    {
      method: 'POST',
      path: '/orders',
      handler: 'api::order.order.create',
      config: { policies: ['api::session.is-authenticated'] },
    },
    {
      method: 'POST',
      path: '/orders/preview-promo',
      handler: 'api::order.order.previewPromo',
      config: { policies: ['api::session.is-authenticated'] },
    },
    {
      method: 'POST',
      path: '/orders/:id/mark-paid',
      handler: 'api::order.order.markPaid',
      config: { policies: ['api::session.is-authenticated'] },
    },
    {
      method: 'GET',
      path: '/me/orders',
      handler: 'api::order.order.findMine',
      config: { policies: ['api::session.is-authenticated'] },
    },
    {
      method: 'GET',
      path: '/me/orders/:id',
      handler: 'api::order.order.findOneMine',
      config: { policies: ['api::session.is-authenticated'] },
    },
  ],
};
