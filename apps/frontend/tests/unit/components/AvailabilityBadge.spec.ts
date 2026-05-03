import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AvailabilityBadge from '~/components/AvailabilityBadge.vue';

describe('AvailabilityBadge', () => {
  it('не рендерится при remaining > 20% от capacity', () => {
    const w = mount(AvailabilityBadge, {
      props: { capacity: 100, remaining: 50 },
    });
    expect(w.text()).toBe('');
  });

  it('рендерит "Осталось N мест" при remaining ≤ 20%', () => {
    const w = mount(AvailabilityBadge, {
      props: { capacity: 100, remaining: 15 },
    });
    expect(w.text()).toContain('Осталось 15 мест');
  });

  it('использует amber при remaining > 10% (но ≤ 20%)', () => {
    const w = mount(AvailabilityBadge, {
      props: { capacity: 100, remaining: 15 },
    });
    expect(w.html()).toMatch(/text-amber-|bg-amber-/);
  });

  it('использует rose при remaining ≤ 10%', () => {
    const w = mount(AvailabilityBadge, {
      props: { capacity: 100, remaining: 5 },
    });
    expect(w.html()).toMatch(/text-rose-|bg-rose-/);
  });

  it('не рендерится при remaining = 0', () => {
    const w = mount(AvailabilityBadge, {
      props: { capacity: 100, remaining: 0 },
    });
    expect(w.text()).toBe('');
  });

  it('правильно склоняет: 1 место, 3 места, 5 мест', () => {
    const w1 = mount(AvailabilityBadge, { props: { capacity: 100, remaining: 1 } });
    expect(w1.text()).toContain('Осталось 1 место');

    const w3 = mount(AvailabilityBadge, { props: { capacity: 100, remaining: 3 } });
    expect(w3.text()).toContain('Осталось 3 места');

    const w5 = mount(AvailabilityBadge, { props: { capacity: 100, remaining: 5 } });
    expect(w5.text()).toContain('Осталось 5 мест');
  });
});
