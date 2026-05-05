// Каталог событий: list/findBySlug/search.
import type { Event, StrapiCollection } from '~/types/api';
import { unwrapStrapi } from '~/utils/api';

interface ListParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  filters?: Record<string, unknown>;
}

const POPULATE_LIST = ['coverImage', 'organizer.logo', 'tiers', 'category', 'venue'];
const POPULATE_DETAIL = [
  'coverImage', 'gallery', 'pastGallery',
  'venue', 'organizer.logo',
  'tiers',
  'speakers.photo',
  'agenda.speakers.photo',
];

export const useEvents = () => {
  const { $api } = useNuxtApp();

  const list = async ({ page = 1, pageSize = 20, sort = 'startsAt:asc', filters }: ListParams = {}): Promise<Event[]> => {
    const query: Record<string, any> = {
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
      sort,
    };
    POPULATE_LIST.forEach((p, i) => { query[`populate[${i}]`] = p; });
    if (filters) Object.assign(query, filters);
    const res = await ($api as any)('/events', { query });
    return unwrapStrapi(res as StrapiCollection<Event>);
  };

  const findBySlug = async (slug: string): Promise<Event> => {
    const query: Record<string, any> = { 'filters[slug][$eq]': slug };
    POPULATE_DETAIL.forEach((p, i) => { query[`populate[${i}]`] = p; });
    const res = await ($api as any)('/events', { query });
    const items = unwrapStrapi(res as StrapiCollection<Event>);
    if (!items.length) {
      const err: any = new Error('Event not found');
      err.statusCode = 404;
      throw err;
    }
    return items[0]!;
  };

  const search = async (q: string, { page = 1, pageSize = 20 } = {}): Promise<Event[]> => {
    const query: Record<string, any> = {
      q,
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
    };
    POPULATE_LIST.forEach((p, i) => { query[`populate[${i}]`] = p; });
    const res = await ($api as any)('/events/search', { query });
    return unwrapStrapi(res as StrapiCollection<Event>);
  };

  return { list, findBySlug, search };
};
