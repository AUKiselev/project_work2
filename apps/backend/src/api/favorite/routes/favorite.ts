export default {
  routes: [
    {
      method: 'POST',
      path: '/favorites',
      handler: 'api::favorite.favorite.addFavorite',
      config: { policies: ['api::session.is-authenticated'] },
    },
    {
      method: 'DELETE',
      path: '/favorites/:eventId',
      handler: 'api::favorite.favorite.removeFavorite',
      config: { policies: ['api::session.is-authenticated'] },
    },
    {
      method: 'GET',
      path: '/me/favorites',
      handler: 'api::favorite.favorite.findMine',
      config: { policies: ['api::session.is-authenticated'] },
    },
  ],
};
