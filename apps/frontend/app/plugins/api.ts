/**
 * $api — обёртка над $fetch с baseURL, авто-инжекцией Bearer и
 * single-flight авто-рефрешем на 401.
 *
 * Используется для всех endpoint'ов, кроме /auth/local, /auth/local/register,
 * /auth/refresh, /auth/logout — те бьют $fetch напрямую из auth-стора,
 * иначе получим рекурсию refresh→401→refresh.
 *
 *   const { $api } = useNuxtApp();
 *   const sessions = await $api('/auth/sessions');
 */
import { useAuthStore } from '~/stores/auth';

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();

  // Single-flight: пока идёт refresh, все 401-ответы ждут одну и ту же
  // промису, чтобы не штормить бэкенд параллельными вызовами.
  let refreshing: Promise<boolean> | null = null;
  const ensureRefreshed = (auth: ReturnType<typeof useAuthStore>): Promise<boolean> => {
    if (!refreshing) {
      refreshing = auth.refresh().finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  };

  const api = $fetch.create({
    baseURL: config.public.apiBase,
    credentials: 'include',
    onRequest({ options }) {
      const auth = useAuthStore();
      if (auth.accessToken) {
        const headers = new Headers(options.headers as HeadersInit | undefined);
        headers.set('Authorization', `Bearer ${auth.accessToken}`);
        options.headers = headers;
      }
    },
  });

  // Обёртка с retry-логикой. Не помещаем в onResponseError, чтобы
  // полностью контролировать поток (в т.ч. возврат повторного результата).
  const $api: typeof api = (async (request: any, opts: any = {}) => {
    try {
      return await api(request, opts);
    } catch (err: any) {
      const status = err?.response?.status ?? err?.statusCode;
      if (status !== 401 || opts.__retried) throw err;
      const auth = useAuthStore();
      const ok = await ensureRefreshed(auth);
      if (!ok) throw err;
      return api(request, { ...opts, __retried: true });
    }
  }) as typeof api;

  return {
    provide: { api: $api },
  };
});
