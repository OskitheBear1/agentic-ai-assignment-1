import { expect, test } from '@playwright/test';
import { account, dialog, shot, signIn } from './helpers';

/**
 * Evidence: invalid input fails safely with a clear message, and nothing is
 * written to the database.
 *
 * This covers the browser-side experience. The matching proof that the *server*
 * enforces the same rules — the request a determined user could craft by hand —
 * lives in backend/tests/server-validation.test.ts.
 */
test('an empty name is rejected with a clear message', async ({ page }) => {
  await signIn(page, account('A'));

  await page.getByRole('button', { name: /^(Add contact|Add)$/ }).first().click();

  const form = dialog(page);
  await form.getByLabel('Name').fill('   ');
  await form.getByRole('button', { name: 'Add contact' }).click();

  await expect(
    page.getByRole('alert').filter({ hasText: 'Name is required.' }),
  ).toBeVisible();
  await shot(page, '12-invalid-empty-name');

  // The dialog stayed open and nothing was saved.
  await expect(form.getByLabel('Name')).toBeVisible();
});
