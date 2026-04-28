import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
    '@nuxt/ui',
  ],

  // Tailwind v4 — единственный CSS-entrypoint импортирует @tailwindcss.
  css: ['~/assets/css/app.css'],

  // Маппинг env -> runtimeConfig: NUXT_PUBLIC_* идут в public, остальные приватные.
  // Значения подставляются из переменных окружения, заданных Docker Compose.
  runtimeConfig: {
    apiSecret: '',
    public: {
      siteUrl: '',
      apiBase: '',
      // Имя refresh-cookie на бэке (зеркалит UP_REFRESH_COOKIE_NAME).
      refreshCookieName: 'strapi_up_refresh',
      appEnv: '',
    },
  },

  // PWA-манифест и сервис-воркер. Иконки сгенерированы из public/logo.svg
  // через `npx pwa-assets-generator` (см. pwa-assets.config.ts).
  pwa: {
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
    manifest: {
      name: 'ProjectWork2',
      short_name: 'PW2',
      description: 'ProjectWork2 web app',
      theme_color: '#0f172a',
      background_color: '#0f172a',
      display: 'standalone',
      start_url: '/',
      icons: [
        {
          src: '/pwa-64x64.png',
          sizes: '64x64',
          type: 'image/png',
        },
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: '/maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      navigateFallback: '/',
      // SW не должен кешировать API-ответы — токены и сессии меняются часто.
      runtimeCaching: [
        {
          urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
          handler: 'NetworkOnly',
        },
      ],
    },
    devOptions: {
      enabled: false,
    },
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      // Разрешаем HMR через Traefik (host = app.localhost) и при разработке через LAN.
      hmr: {
        clientPort: 24678,
      },
    },
  },
});
