// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Маппинг env -> runtimeConfig: NUXT_PUBLIC_* идут в public, остальные приватные.
  // Значения подставляются из переменных окружения, заданных Docker Compose.
  runtimeConfig: {
    apiSecret: '',
    public: {
      siteUrl: '',
      apiBase: ''
    }
  },

  vite: {
    server: {
      // Разрешаем HMR через Traefik (host = app.localhost) и при разработке через LAN.
      hmr: {
        clientPort: 24678
      }
    }
  }
})
