// Доступность мероприятия: capacity / sold / remaining с кэшем по slug.
import { useNuxtApp, useState } from '#app';

type Availability = { capacity: number; sold: number; remaining: number };

export function useEventAvailability() {
  const { $api } = useNuxtApp();
  const state = useState<Record<string, Availability>>('event-availability', () => ({}));

  async function fetch(slug: string): Promise<void> {
    if (state.value[slug]) return;
    try {
      const res = await ($api as any)(`/events/${slug}/availability`);
      state.value = { ...state.value, [slug]: res.data };
    } catch {
      // Молча игнорируем — UI просто не покажет бейдж доступности.
    }
  }

  function get(slug: string): Availability | undefined {
    return state.value[slug];
  }

  return { state, fetch, get };
}
