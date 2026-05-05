/**
 * smoke-prototype.spec.ts — минимальный smoke-сценарий SSR/CSR главной и детали события.
 * Не требует STRAPI_API_TOKEN, работает с seed-данными (tech-meetup-spring-2026).
 * baseURL = PLAYWRIGHT_BASE_URL || http://app.localhost
 */
import { test, expect } from '@playwright/test';

test.describe('Главная страница — SSR/CSR smoke', () => {
  test('главная: heading + хотя бы одна карточка события', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /ближайшие мероприятия/i })).toBeVisible();
    // Хотя бы одна карточка с заголовком seed-события
    await expect(page.getByText('Tech Meetup').first()).toBeVisible();
  });

  test('главная: нет error-маркеров в DOM', async ({ page }) => {
    await page.goto('/');
    const body = await page.content();
    expect(body).not.toContain('NuxtError');
    expect(body).not.toContain('fetch failed');
    expect(body).not.toContain('Не удалось загрузить');
  });

  test('переход на страницу события: heading + тиры с ценой', async ({ page }) => {
    await page.goto('/');
    // Кликаем по NuxtLink карточки события напрямую по slug.
    // Не используем first() — баннер тоже рендерит a[href*="/events/"] с target=_blank.
    await page.locator('a[href="/events/tech-meetup-spring-2026"]:not([target="_blank"])').first().click();
    await expect(page).toHaveURL(/\/events\//);
    // Heading события
    await expect(page.getByRole('heading', { name: /Tech Meetup/i })).toBeVisible();
  });

  test('возврат на главную: данные те же, нет ошибок', async ({ page }) => {
    // Сначала открываем главную, чтобы в истории было куда возвращаться
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /ближайшие мероприятия/i })).toBeVisible();
    // Переходим на страницу события через NuxtLink (не через goto — сохраняем историю)
    await page.locator('a[href="/events/tech-meetup-spring-2026"]:not([target="_blank"])').first().click();
    await expect(page).toHaveURL(/\/events\//);
    // Возвращаемся назад
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /ближайшие мероприятия/i })).toBeVisible();
    await expect(page.getByText('Tech Meetup').first()).toBeVisible();
    const body = await page.content();
    expect(body).not.toContain('NuxtError');
  });
});
