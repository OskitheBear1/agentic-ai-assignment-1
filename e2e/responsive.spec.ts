import { expect, test } from '@playwright/test';
import { account, addContact, clearContacts, shot, signIn } from './helpers';

/** Evidence: the UI is usable on a phone, not just a laptop. */
test('mobile layout', async ({ page }) => {
  await signIn(page, account('A'));
  await clearContacts(page);

  await addContact(page, {
    name: 'Marcus Chen',
    company: 'Northwind Capital',
    role: 'Principal',
    whereMet: 'Berkeley Haas career fair',
    priority: 'high',
  });

  // Below the sm breakpoint the table is replaced by stacked cards.
  await expect(page.locator('table')).toBeHidden();
  await expect(page.getByText('Marcus Chen')).toBeVisible();
  await expect(page.getByText('Northwind Capital')).toBeVisible();
  await shot(page, '15-mobile-list');

  await page.getByRole('button', { name: /^Add$/ }).first().click();
  await expect(page.getByLabel('Name')).toBeVisible();
  await shot(page, '16-mobile-form');

  await page.getByRole('button', { name: 'Cancel' }).click();
  await clearContacts(page);
});
