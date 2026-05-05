/**
 * $api — обёртка над $fetch с baseURL, авто-инжекцией Bearer и
 * single-flight авто-рефрешем на 401. Глобальный toast для
 * сетевых/5xx ошибок (не 400/401).
 */
import { useAuthStore } from '~/stores/auth';
import { parseStrapiError } from '~/utils/api';

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();

  let refreshing: Promise<boolean> | null = null;
  const ensureRefreshed = (auth: ReturnType<typeof useAuthStore>): Promise<boolean> => {
    if (!refreshing) {
      refreshing = auth.refresh().finally(() => { refreshing = null; });
    }
    return refreshing;
  };

  // На SSR бьём по внутреннему URL бэка (контейнер `backend`), так как
  // публичный `api.localhost` внутри docker-сети не резолвится в Strapi.
  // На клиенте оставляем публичный apiBase, который ходит через Traefik.
  const baseURL = (import.meta.server && config.apiBaseServer)
    ? config.apiBaseServer
    : config.public.apiBase;

  const api = $fetch.create({
    baseURL,
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

  const showToastForError = (err: any) => {
    const parsed = parseStrapiError(err);
    // 0 (network) и 5xx — общий toast.
    if (parsed.status === 0 || parsed.status >= 500) {
      try {
        const toast = nuxtApp.runWithContext(() => useToast());
        toast.add({ color: 'red', title: 'Сервер недоступен', description: parsed.message });
      } catch {/* SSR */}
      return;
    }
    // 401 — обработается single-flight выше; здесь не трогаем.
    // 400 — формы сами покажут ошибки; не toast'им.
    // 4xx прочие — короткий toast.
    if (parsed.status >= 401 && parsed.status < 500 && parsed.status !== 400 && parsed.status !== 401) {
      try {
        const toast = nuxtApp.runWithContext(() => useToast());
        toast.add({ color: 'red', title: 'Ошибка', description: parsed.message });
      } catch {/* SSR */}
    }
  };

  const $api: typeof api = (async (request: any, opts: any = {}) => {
    try {
      return await api(request, opts);
    } catch (err: any) {
      const status = err?.response?.status ?? err?.statusCode;
      if (status === 401 && !opts.__retried) {
        const auth = useAuthStore();
        const ok = await ensureRefreshed(auth);
        if (ok) return api(request, { ...opts, __retried: true });
      }
      // Один глобальный toast (не для validation 400 и не для 401).
      showToastForError(err);
      throw err;
    }
  }) as typeof api;

  return { provide: { api: $api } };
});
