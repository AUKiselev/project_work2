import { test, expect } from '@playwright/test';

test.describe('Polish: navigation and visual', () => {
  test('в шапке одна кнопка «Войти», нет «Регистрация»', async ({ page }) => {
    // AppTopNav рендерится только на десктопе (hidden lg:flex)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const header = page.locator('header').first();
    await expect(header.getByText('Войти')).toBeVisible();
    await expect(header.getByText('Регистрация')).toHaveCount(0);
  });

  test('на /login есть видимая кнопка «Создать аккаунт»', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /создать аккаунт/i })).toBeVisible();
  });

  test.describe('footer (desktop)', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('footer виден и все 5 внутренних ссылок открываются', async ({ page }) => {
      await page.goto('/');
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();

      const internal = ['/info/about', '/info/contacts', '/account/become-speaker', '/info/terms', '/info/offer'];
      for (const href of internal) {
        const link = footer.locator(`a[href="${href}"]`).first();
        await expect(link).toBeVisible();
      }
    });

    test('footer-ссылки info ведут на 200-страницы с h1', async ({ page }) => {
      const paths = ['/info/about', '/info/contacts', '/info/terms', '/info/offer'];
      for (const p of paths) {
        const res = await page.goto(p);
        expect(res?.status()).toBe(200);
        await expect(page.locator('h1').first()).toBeVisible();
      }
    });
  });

  test.describe('footer (mobile)', () => {
    test.use({ viewport: { width: 390, height: 800 } });

    test('footer скрыт на мобиле', async ({ page }) => {
      await page.goto('/');
      const footer = page.locator('footer');
      // hidden lg:block → не виден в мобильном viewport
      await expect(footer).toBeHidden();
    });
  });

  test('главная: видна категория «Митап» или «Конференция»', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Митап|Конференция/).first()).toBeVisible();
  });

  test('главная: AvailabilityBadge виден на product-conference (close to sold-out)', async ({ page }) => {
    await page.goto('/');
    // Дать время на client-side fetch availability
    await page.waitForLoadState('networkidle');
    const badge = page.getByText(/Осталось \d+ мест/i);
    await expect(badge).toBeVisible({ timeout: 5000 });
  });

  test('empty-state: /search?q=ыыыыыы — иллюстрация search', async ({ page }) => {
    await page.goto('/search?q=ыыыыыы');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('svg[data-name="search"]')).toBeVisible();
  });
});
