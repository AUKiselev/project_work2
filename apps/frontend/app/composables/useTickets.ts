// Билеты пользователя. listMine/findOneMine.
import type { StrapiCollection, StrapiSingle, Ticket } from '~/types/api';
import { unwrapStrapi } from '~/utils/api';

const POPULATE_TICKET_LIST = ['event.coverImage', 'event.venue', 'tier'];
const POPULATE_TICKET_ONE = [
  'event.coverImage', 'event.venue', 'event.organizer.logo',
  'tier', 'order.tickets.event.venue',
];

export const useTickets = () => {
  const { $api } = useNuxtApp();

  const listMine = async (): Promise<Ticket[]> => {
    const query: Record<string, any> = { sort: 'event.startsAt:asc' };
    POPULATE_TICKET_LIST.forEach((p, i) => { query[`populate[${i}]`] = p; });
    const res = await ($api as any)('/me/tickets', { query });
    return unwrapStrapi(res as StrapiCollection<Ticket>);
  };

  const findOneMine = async (id: number): Promise<Ticket> => {
    const query: Record<string, any> = {};
    POPULATE_TICKET_ONE.forEach((p, i) => { query[`populate[${i}]`] = p; });
    const res = await ($api as any)(`/me/tickets/${id}`, { query });
    return unwrapStrapi(res as StrapiSingle<Ticket>);
  };

  return { listMine, findOneMine };
};
