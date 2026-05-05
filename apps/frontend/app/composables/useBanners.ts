// Активные баннеры. Бэк фильтрует активные (activeFrom/activeUntil/priority).
import type { Banner, StrapiCollection } from '~/types/api';
import { unwrapStrapi } from '~/utils/api';

export const useBanners = () => {
  const { $api } = useNuxtApp();

  const list = async (): Promise<Banner[]> => {
    const res = await ($api as any)('/banners', {
      query: { 'populate[0]': 'image', sort: 'priority:desc' },
    });
    return unwrapStrapi(res as StrapiCollection<Banner>);
  };

  return { list };
};
