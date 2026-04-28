/**
 * Тонкий KV-стор. На native — @capacitor/preferences (NSUserDefaults /
 * SharedPreferences); на web — localStorage. На SSR no-op.
 *
 * ВНИМАНИЕ: Preferences НЕ являются secure storage. Для прод-мобилки
 * refresh-токен следует переехать в Keychain/Keystore (например через
 * @aparajita/capacitor-secure-storage). Здесь — единая точка замены.
 */
import { Preferences } from '@capacitor/preferences';
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
