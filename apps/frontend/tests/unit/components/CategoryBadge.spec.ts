import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CategoryBadge from '~/components/CategoryBadge.vue';

describe('CategoryBadge', () => {
  it('рендерит title', () => {
    const wrapper = mount(CategoryBadge, {
      props: { category: { title: 'Митап', colorToken: 'sky' } },
    });
    expect(wrapper.text()).toContain('Митап');
  });

  it('применяет класс цвета по colorToken', () => {
    const wrapper = mount(CategoryBadge, {
      props: { category: { title: 'Конференция', colorToken: 'primary' } },
    });
    expect(wrapper.html()).toMatch(/bg-primary-500\/15|text-primary-/);
  });

  it('не рендерится при отсутствии category', () => {
    const wrapper = mount(CategoryBadge, {
      props: { category: null as any },
    });
    expect(wrapper.text()).toBe('');
  });
});
