import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EmptyIllustration from '~/components/EmptyIllustration.vue';

describe('EmptyIllustration', () => {
  it.each(['favorites', 'tickets', 'search', 'generic'] as const)(
    'рендерит SVG для name=%s',
    (name) => {
      const w = mount(EmptyIllustration, { props: { name } });
      expect(w.html()).toContain('<svg');
      expect(w.html()).toMatch(/data-name="[a-z]+"/);
    },
  );

  it('падает на generic при неизвестном name', () => {
    const w = mount(EmptyIllustration, {
      props: { name: 'unknown' as any },
    });
    expect(w.html()).toContain('data-name="generic"');
  });

  it('падает на generic если name не задан', () => {
    const w = mount(EmptyIllustration, { props: {} as any });
    expect(w.html()).toContain('data-name="generic"');
  });
});
