import type { SpeakerApplicationPayload } from '~/types/api';

export const useSpeakerApplication = () => {
  const { $api } = useNuxtApp();

  const submit = async (payload: SpeakerApplicationPayload) => {
    await ($api as any)('/speaker-applications', { method: 'POST', body: { data: payload } });
  };

  return { submit };
};
