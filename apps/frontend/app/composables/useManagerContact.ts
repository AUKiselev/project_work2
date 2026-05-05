import type { ManagerContactPayload } from '~/types/api';

export const useManagerContact = () => {
  const { $api } = useNuxtApp();

  const submit = async (payload: ManagerContactPayload) => {
    await ($api as any)('/manager-contact-requests', { method: 'POST', body: { data: payload } });
  };

  return { submit };
};
