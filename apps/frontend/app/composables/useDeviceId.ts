/**
 * Стабильный per-install deviceId. UUID v4, кладётся в storage на первом
 * обращении и не меняется до переустановки/чистки данных. Используется
 * бэкендом как ключ дедупа сессий — никогда для авторизации.
 */
import { v4 as uuidv4 } from 'uuid';
import { storage } from '~/utils/storage';

const KEY = 'pw2.deviceId';

let cached: string | null = null;

export const useDeviceId = () => {
  const ensure = async (): Promise<string> => {
    if (cached) return cached;
    const existing = await storage.get(KEY);
    if (existing) {
      cached = existing;
      return existing;
    }
    const fresh = uuidv4();
    await storage.set(KEY, fresh);
    cached = fresh;
    return fresh;
  };

  const reset = async () => {
    cached = null;
    await storage.remove(KEY);
  };

  return { ensure, reset };
};
