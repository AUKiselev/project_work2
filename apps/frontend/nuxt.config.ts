import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
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
    },
  },

  // PWA-манифест и сервис-воркер. Иконки 192/512 — плейсхолдеры в /public,
  // финальные генерируются отдельным шагом (assets-generator) — см. README.
  pwa: {
    registerType: 'autoUpdate',
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
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
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
