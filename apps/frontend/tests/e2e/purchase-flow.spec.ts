import { test, expect, request } from '@playwright/test';
import { seedEvent } from './fixtures/seed';

const SLUG = 'e2e-conf-2026';
const username = `e2e_${Date.now()}`;
const email = `${username}@test.local`;
const password = 'pa55word';

test.beforeAll(async () => {
  const req = await request.newContext();
  await seedEvent(req);
  await req.dispose();
});

test('полный сценарий покупки билета', async ({ page }) => {
  // 1. Регистрация
  await page.goto('/register');
  await page.getByLabel('Логин').fill(username);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page).toHaveURL('/');

  // 2. Лента и тап на seed-event
  await expect(page.getByText('E2E конференция 2026')).toBeVisible();
  await page.getByText('E2E конференция 2026').click();
  await expect(page).toHaveURL(`/events/${SLUG}`);

  // 3. Купить
  await page.getByRole('button', { name: 'Купить' }).click();
  await expect(page).toHaveURL(`/events/${SLUG}/checkout`);

  // 4. +2 на Standard
  const stepperPlus = page.locator('button', { hasText: '+' }).first();
  await stepperPlus.click();
  await stepperPlus.click();

  // 5. Оформить
  await page.getByRole('button', { name: 'Оформить' }).click();
  await expect(page).toHaveURL(`/events/${SLUG}/checkout/pay`);

  // 6. Анкеты
  const fullName = page.getByLabel('ФИО');
  await fullName.nth(0).fill('Иванов Иван');
  await fullName.nth(1).fill('Петров Пётр');

  // 7. Способ оплаты + согласие
  await page.getByText('Картой').click();
  await page.getByLabel(/Согласен/).check();

  await page.getByRole('button', { name: 'Оплатить' }).click();

  // 8. Mock-pay
  await page.waitForURL(/\/orders\/\d+\/pay/);
  await page.getByRole('button', { name: 'Симулировать оплату' }).click();

  // 9. /tickets — 2 строки
  await page.waitForURL('/tickets');
  await expect(page.getByText('E2E конференция 2026').nth(0)).toBeVisible();
});
