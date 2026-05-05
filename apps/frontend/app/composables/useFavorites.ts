// Избранное: тонкая обёртка над favoritesStore + сетевые операции.
import type { Favorite, StrapiCollection } from '~/types/api';
import { unwrapStrapi } from '~/utils/api';
import { useFavoritesStore } from '~/stores/favorites';

export const useFavorites = () => {
  const { $api } = useNuxtApp();
  const store = useFavoritesStore();

  const ensureLoaded = async (): Promise<void> => {
    if (store.loaded) return;
    const res = await ($api as any)('/me/favorites', {
      query: { 'populate[0]': 'event.coverImage' },
    });
    const favs = unwrapStrapi(res as StrapiCollection<Favorite>);
    store.setLoaded(favs.map((f) => f.event));
  };

  const listMine = async (): Promise<Favorite[]> => {
    const res = await ($api as any)('/me/favorites', {
      query: { 'populate[0]': 'event.coverImage' },
    });
    const favs = unwrapStrapi(res as StrapiCollection<Favorite>);
    store.setLoaded(favs.map((f) => f.event));
    return favs;
  };

  const add = async (eventId: number): Promise<void> => {
    store.addLocal(eventId);
    try {
      await ($api as any)('/favorites', { method: 'POST', body: { eventId } });
    } catch (err) {
      store.removeLocal(eventId);
      throw err;
    }
  };

  const remove = async (eventId: number): Promise<void> => {
    store.removeLocal(eventId);
    try {
      await ($api as any)(`/favorites/${eventId}`, { method: 'DELETE' });
    } catch (err) {
      store.addLocal(eventId);
      throw err;
    }
  };

  const isFavorite = (eventId: number) => store.has(eventId);

  return { ensureLoaded, listMine, add, remove, isFavorite };
};
