import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { RouterLinkStub } from '@vue/test-utils';
import AppFooter from '~/components/AppFooter.vue';

const stubs = {
  NuxtLink: {
    props: ['to'],
    template: '<a :href="to"><slot /></a>',
  },
  UIcon: { template: '<i class="ui-icon-stub"><slot /></i>' },
};

describe('AppFooter', () => {
  it('содержит 5 внутренних ссылок', () => {
    const w = mount(AppFooter, { global: { stubs } });
    const html = w.html();
    expect(html).toContain('/info/about');
    expect(html).toContain('/info/contacts');
    expect(html).toContain('/account/become-speaker');
    expect(html).toContain('/info/terms');
    expect(html).toContain('/info/offer');
  });

  it('соц-ссылки имеют target="_blank" и rel="noopener"', () => {
    const w = mount(AppFooter, { global: { stubs } });
    const externals = w.findAll('a[target="_blank"]');
    expect(externals.length).toBeGreaterThanOrEqual(3);
    for (const a of externals) {
      expect(a.attributes('rel')).toContain('noopener');
    }
  });

  it('содержит copyright', () => {
    const w = mount(AppFooter, { global: { stubs } });
    expect(w.text()).toContain('© 2026');
    expect(w.text()).toContain('Клуб Спикеров');
  });
});
