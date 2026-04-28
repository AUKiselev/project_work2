// navigator.share с fallback на clipboard + toast.
import { useClipboard } from '@vueuse/core';

export const useShare = () => {
  const { copy } = useClipboard();
  const toast = useToast();

  const share = async ({ title, text, url }: { title?: string; text?: string; url: string }) => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err: any) {
        // AbortError = пользователь закрыл sheet — молчим.
        if (err?.name === 'AbortError') return;
        // Иначе — fallback.
      }
    }
    await copy(url);
    toast.add({ title: 'Ссылка скопирована' });
  };

  return { share };
};
