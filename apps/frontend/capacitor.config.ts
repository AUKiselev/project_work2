import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor конфиг для iOS / Android оболочек.
// CAP_APP_ID и CAP_APP_NAME берутся из корневого .env (Docker НЕ участвует
// в нативной сборке — это Xcode/Android Studio). Для CI/dev можно
// пробрасывать через окружение перед `npx cap sync`.
const config: CapacitorConfig = {
  appId: process.env.CAP_APP_ID || 'com.example.projectwork2',
  appName: process.env.CAP_APP_NAME || 'ProjectWork2',
  webDir: 'dist',
  server: {
    // В dev — указать LAN IP машины с `nuxt dev` (CAP_SERVER_URL),
    // тогда устройство будет грузить страницы с горячей перезагрузкой.
    // В prod оставить пустым: будет использоваться сбандленный webDir.
    url: process.env.CAP_SERVER_URL || undefined,
    cleartext: process.env.NODE_ENV !== 'production',
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: process.env.NODE_ENV !== 'production',
  },
};

export default config;
