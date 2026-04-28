import {
  defineConfig,
  minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config';

// Конфиг для @vite-pwa/assets-generator. Запуск:
//   npx pwa-assets-generator
// Берёт `public/logo.svg` и кладёт результат в `public/`.
export default defineConfig({
  preset,
  images: ['public/logo.svg'],
});
