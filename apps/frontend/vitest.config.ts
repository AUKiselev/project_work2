import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    environmentOptions: {
      happyDOM: {
        settings: {
          disableJavaScriptEvaluation: true,
        },
      },
    },
    globals: true,
    include: ['tests/unit/**/*.{spec,test}.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url)),
      // Нужен для vi.mock('#app', ...) в unit-тестах composables.
      '#app': fileURLToPath(new URL('./node_modules/nuxt/dist/app/index.js', import.meta.url)),
    },
  },
});
