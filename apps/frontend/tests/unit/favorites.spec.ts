import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFavoritesStore } from '~/stores/favorites';

beforeEach(() => setActivePinia(createPinia()));

describe('favorites store', () => {
  it('has(id) после addLocal/removeLocal', () => {
    const f = useFavoritesStore();
    expect(f.has(42)).toBe(false);
    f.addLocal(42);
    expect(f.has(42)).toBe(true);
    f.removeLocal(42);
    expect(f.has(42)).toBe(false);
  });
  it('reset очищает', () => {
    const f = useFavoritesStore();
    f.addLocal(1); f.addLocal(2);
    f.reset();
    expect(f.has(1)).toBe(false);
    expect(f.loaded).toBe(false);
  });
  it('setLoaded помечает loaded=true', () => {
    const f = useFavoritesStore();
    f.setLoaded([{ id: 10 }, { id: 11 }]);
    expect(f.has(10)).toBe(true);
    expect(f.has(11)).toBe(true);
    expect(f.loaded).toBe(true);
  });
});
