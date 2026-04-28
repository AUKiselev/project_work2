/**
 * Для guest-роутов (login, register). Логинутого пользователя уводим на /.
 */
import { useAuthStore } from '~/stores/auth';

export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return;
  const auth = useAuthStore();
  if (auth.isAuthenticated) return navigateTo('/');
});
