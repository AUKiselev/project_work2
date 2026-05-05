import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

const mockApi = vi.fn();

vi.mock('#app', () => ({
  useNuxtApp: () => ({ $api: mockApi }),
  useState: <T>(_k: string, fn: () => T) => ref(fn()),
}));

import { useEventAvailability } from '~/composables/useEventAvailability';

describe('useEventAvailability', () => {
  beforeEach(() => {
    mockApi.mockReset();
  });

  it('загружает availability по slug', async () => {
    mockApi.mockResolvedValueOnce({ data: { capacity: 100, sold: 30, remaining: 70 } });
    const { fetch, state } = useEventAvailability();
    await fetch('tech-meetup-spring-2026');
    expect(state.value['tech-meetup-spring-2026']).toEqual({ capacity: 100, sold: 30, remaining: 70 });
    expect(mockApi).toHaveBeenCalledWith('/events/tech-meetup-spring-2026/availability');
  });

  it('кэширует результат — повторный fetch не делает запрос', async () => {
    mockApi.mockResolvedValueOnce({ data: { capacity: 100, sold: 30, remaining: 70 } });
    const { fetch } = useEventAvailability();
    await fetch('tech-meetup-spring-2026');
    await fetch('tech-meetup-spring-2026');
    expect(mockApi).toHaveBeenCalledTimes(1);
  });

  it('игнорирует ошибки и не валит вызов', async () => {
    mockApi.mockRejectedValueOnce(new Error('network'));
    const { fetch, state } = useEventAvailability();
    await expect(fetch('any-slug')).resolves.toBeUndefined();
    expect(state.value['any-slug']).toBeUndefined();
  });

  it('get() возвращает кэшированное значение', async () => {
    mockApi.mockResolvedValueOnce({ data: { capacity: 100, sold: 30, remaining: 70 } });
    const { fetch, get } = useEventAvailability();
    expect(get('tech-meetup-spring-2026')).toBeUndefined();
    await fetch('tech-meetup-spring-2026');
    expect(get('tech-meetup-spring-2026')).toEqual({ capacity: 100, sold: 30, remaining: 70 });
  });
});
