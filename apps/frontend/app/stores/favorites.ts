// Кэш id-шников избранных событий + флаг "загружали ли вообще".
// Сетевые операции делает useFavorites composable; стор — чистое
// in-memory хранилище для optimistic UI.
import { defineStore } from 'pinia';

interface FavoritesState {
  ids: Set<number>;
  loaded: boolean;
}

export const useFavoritesStore = defineStore('favorites', {
  state: (): FavoritesState => ({
    ids: new Set<number>(),
    loaded: false,
  }),
  getters: {
    has: (s) => (eventId: number) => s.ids.has(eventId),
    asArray: (s) => Array.from(s.ids),
  },
  actions: {
    setLoaded(events: Array<{ id: number }>) {
      this.ids = new Set(events.map((e) => e.id));
      this.loaded = true;
    },
    addLocal(eventId: number) { this.ids.add(eventId); },
    removeLocal(eventId: number) { this.ids.delete(eventId); },
    reset() {
      this.ids.clear();
      this.loaded = false;
    },
  },
});
