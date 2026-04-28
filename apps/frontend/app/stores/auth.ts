/**
 * Auth-store (Pinia).
 *
 * Source of truth для access-токена и текущего пользователя.
 * Refresh-токен НИКОГДА не хранится в этом сторе:
 *  - web → HttpOnly+Secure cookie (ставит сервер; включаем заголовком
 *    `x-strapi-refresh-cookie: httpOnly` при логине/регистрации)
 *  - native → bearer-строка в storage (Capacitor Preferences)
 *
 * Access-токен — только в памяти. Перезагрузка страницы → пустой стор →
 * на первом полезном запросе автоматически вызывается refresh.
 */
import { defineStore } from 'pinia';
import { useDeviceId } from '~/composables/useDeviceId';
import { secureStorage } from '~/utils/storage';
import { isNative, platformName } from '~/utils/platform';

const REFRESH_KEY = 'pw2.refreshToken';

interface User {
  id: number;
  username: string;
  email: string;
  confirmed?: boolean;
  blocked?: boolean;
}

interface LoginPayload {
  identifier: string;
  password: string;
  deviceName?: string;
}

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  deviceName?: string;
}

interface AuthResponse {
  jwt: string;
  refreshToken?: string;
  user: User;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    accessToken: null as string | null,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (s) => !!s.user && !!s.accessToken,
  },

  actions: {
    /**
     * Транспорт refresh-токена. На web — HttpOnly cookie (без участия JS),
     * на native — bearer в storage.
     */
    _refreshHeaders(): Record<string, string> {
      return isNative() ? {} : { 'x-strapi-refresh-cookie': 'httpOnly' };
    },

    async _saveRefresh(token: string | undefined) {
      if (!token) return;
      // На native — Keychain/Keystore через secureStorage. На web сервер
      // кладёт refresh в HttpOnly-cookie; в JS его не видно (no-op).
      await secureStorage.set(REFRESH_KEY, token);
    },

    async _readRefresh(): Promise<string | null> {
      return secureStorage.get(REFRESH_KEY);
    },

    async _clearRefresh() {
      await secureStorage.remove(REFRESH_KEY);
    },

    async _post<T>(path: string, body: Record<string, any>, extraHeaders: Record<string, string> = {}): Promise<T> {
      const config = useRuntimeConfig();
      return $fetch<T>(path, {
        baseURL: config.public.apiBase,
        method: 'POST',
        credentials: 'include',
        headers: { ...this._refreshHeaders(), ...extraHeaders },
        body,
      });
    },

    /**
     * POST /auth/local
     */
    async login(payload: LoginPayload) {
      const { ensure } = useDeviceId();
      const deviceId = await ensure();
      const res = await this._post<AuthResponse>('/auth/local', {
        identifier: payload.identifier,
        password: payload.password,
        deviceId,
        deviceName: payload.deviceName ?? defaultDeviceName(),
      });
      this.user = res.user;
      this.accessToken = res.jwt;
      await this._saveRefresh(res.refreshToken);
    },

    /**
     * POST /auth/local/register
     */
    async register(payload: RegisterPayload) {
      const { ensure } = useDeviceId();
      const deviceId = await ensure();
      const res = await this._post<AuthResponse>('/auth/local/register', {
        username: payload.username,
        email: payload.email,
        password: payload.password,
        deviceId,
        deviceName: payload.deviceName ?? defaultDeviceName(),
      });
      // Если в users-permissions включено email-confirmation, jwt НЕ
      // выдаётся, в ответе только user. В этом случае не логинимся.
      if (res.jwt) {
        this.user = res.user;
        this.accessToken = res.jwt;
        await this._saveRefresh(res.refreshToken);
      }
      return res;
    },

    /**
     * POST /auth/refresh
     */
    async refresh(): Promise<boolean> {
      try {
        const { ensure } = useDeviceId();
        const deviceId = await ensure();
        const refreshToken = await this._readRefresh();
        const res = await this._post<AuthResponse>('/auth/refresh', {
          deviceId,
          ...(refreshToken ? { refreshToken } : {}),
        });
        this.accessToken = res.jwt;
        await this._saveRefresh(res.refreshToken);
        // /auth/refresh не возвращает user — подгружаем отдельно, если ещё нет.
        if (!this.user) await this.fetchMe();
        return true;
      } catch {
        await this._clearLocal();
        return false;
      }
    },

    /**
     * GET /users/me — обновить текущего пользователя.
     */
    async fetchMe() {
      if (!this.accessToken) return;
      const config = useRuntimeConfig();
      try {
        const me = await $fetch<User>('/users/me', {
          baseURL: config.public.apiBase,
          headers: { Authorization: `Bearer ${this.accessToken}` },
          credentials: 'include',
        });
        this.user = me;
      } catch {
        await this._clearLocal();
      }
    },

    /**
     * POST /auth/logout — серверная инвалидация, потом локальная очистка.
     */
    async logout() {
      try {
        const { ensure } = useDeviceId();
        const deviceId = await ensure();
        await this._post('/auth/logout', { deviceId }, this.accessToken
          ? { Authorization: `Bearer ${this.accessToken}` }
          : {});
      } catch {
        /* всё равно гасим локально */
      }
      await this._clearLocal();
    },

    async _clearLocal() {
      this.user = null;
      this.accessToken = null;
      await this._clearRefresh();
      // Сбрасываем cross-page состояние, чтобы данные предыдущего user'а
      // не утекли к следующему вошедшему на этом устройстве.
      try {
        const { useCartStore } = await import('~/stores/cart');
        const { useFavoritesStore } = await import('~/stores/favorites');
        useCartStore().reset();
        useFavoritesStore().reset();
      } catch {
        /* стор может быть не инициализирован — это нормально */
      }
    },

    /**
     * Однократная инициализация на старте клиента: пытаемся восстановить
     * сессию. На web cookie-режиме — refresh без явного токена; на native
     * — берём refresh из storage.
     */
    async hydrate() {
      if (this.initialized) return;
      this.initialized = true;
      if (typeof window === 'undefined') return;
      // На web всегда пробуем — браузер сам подложит cookie, если она есть.
      // На native — только если refresh-токен лежит в storage.
      const haveRefresh = !isNative() || !!(await this._readRefresh());
      if (haveRefresh) {
        await this.refresh();
      }
    },
  },
});

function defaultDeviceName(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const p = platformName();
  if (p === 'ios' || p === 'android') return p === 'ios' ? 'iOS device' : 'Android device';
  return undefined; // на web сервер сам распарсит User-Agent
}
