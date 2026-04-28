/**
 * Тонкий KV-стор с расщеплением по чувствительности данных.
 *
 *   storage      — несекретные значения (deviceId и пр.).
 *                   web → localStorage; native → Capacitor Preferences.
 *   secureStorage — секреты (refresh-токен).
 *                   web → НЕТ access из JS (refresh лежит в HttpOnly-cookie,
 *                         выставляется бэком).
 *                   native → Keychain (iOS) / EncryptedSharedPreferences
 *                         (Android) через @aparajita/capacitor-secure-storage.
 *
 * На SSR оба интерфейса — no-op: ни window, ни нативных bridge'ей нет.
 */
import { Preferences } from '@capacitor/preferences';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { isNative } from './platform';

const isClient = (): boolean => typeof window !== 'undefined';

export const storage = {
  async get(key: string): Promise<string | null> {
    if (!isClient()) return null;
    if (isNative()) {
      const { value } = await Preferences.get({ key });
      return value ?? null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    if (!isClient()) return;
    if (isNative()) {
      await Preferences.set({ key, value });
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* ignore (private mode quotas) */
    }
  },

  async remove(key: string): Promise<void> {
    if (!isClient()) return;
    if (isNative()) {
      await Preferences.remove({ key });
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const secureStorage = {
  /**
   * На web всегда возвращает null — refresh-токен на web живёт в
   * HttpOnly-cookie, в JS он недоступен и не должен быть.
   */
  async get(key: string): Promise<string | null> {
    if (!isClient() || !isNative()) return null;
    try {
      const value = await SecureStorage.get(key);
      return typeof value === 'string' ? value : null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    if (!isClient() || !isNative()) return;
    try {
      await SecureStorage.set(key, value);
    } catch {
      /* keychain недоступен — фейлить тише, заставит перелогиниться */
    }
  },

  async remove(key: string): Promise<void> {
    if (!isClient() || !isNative()) return;
    try {
      await SecureStorage.remove(key);
    } catch {
      /* ignore */
    }
  },
};
