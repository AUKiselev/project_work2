/**
 * Определение целевой платформы. Capacitor работает и в SSR (везде вернёт
 * web). Используем для выбора транспорта refresh-токена и хранилища.
 */
import { Capacitor } from '@capacitor/core';

export const isNative = (): boolean =>
  typeof window !== 'undefined' && Capacitor.isNativePlatform();

export const platformName = (): 'web' | 'ios' | 'android' | 'unknown' => {
  if (typeof window === 'undefined') return 'unknown';
  const p = Capacitor.getPlatform();
  if (p === 'ios' || p === 'android') return p;
  return 'web';
};
