/**
 * Защищает маршрут — пускает только аутентифицированных. На неаутент.
 * редиректит на /login с возвратом на исходный путь.
 */
import { useAuthStore } from '~/stores/auth';

export default defineNuxtRouteMiddleware((to) => {
  // На SSR авторизация не известна — стор пуст до клиентской гидратации.
  // Не редиректим, ждём клиента; компонент сам учтёт состояние.
  if (import.meta.server) return;
  const auth = useAuthStore();
  if (!auth.isAuthenticated) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } });
  }
});
