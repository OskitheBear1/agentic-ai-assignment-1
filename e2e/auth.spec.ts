import { expect, test } from '@playwright/test';
import { account, shot, signIn, signOut, visibleText } from './helpers';

/** Evidence: a user can sign in and sign out. */
test('sign in and sign out', async ({ page }) => {
  const user = account('A');

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await shot(page, '01-sign-in-page');

  await signIn(page, user);
  await expect(visibleText(page, user.email)).toBeVisible();
  await shot(page, '02-signed-in');

  await signOut(page);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await shot(page, '03-signed-out');
});
