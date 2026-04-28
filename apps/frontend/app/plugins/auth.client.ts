/**
 * Восстанавливаем сессию при старте клиента: если есть refresh-cookie (web)
 * или refresh-токен в storage (native), вызываем /auth/refresh и
 * получаем актуальный access + user. Никаких сетевых вызовов на SSR.
 */
import { useAuthStore } from '~/stores/auth';

export default defineNuxtPlugin(async () => {
  const auth = useAuthStore();
  await auth.hydrate();
});
