import { expect, test } from '@playwright/test';
import { account, addContact, clearContacts, dialog, shot, signIn, visibleText } from './helpers';

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
  await expect(visibleText(page, 'Marcus Chen')).toBeVisible();
  await expect(visibleText(page, 'Northwind Capital')).toBeVisible();
  await shot(page, '15-mobile-list');

  await page.getByRole('button', { name: /^Add$/ }).first().click();
  await expect(dialog(page).getByLabel('Name')).toBeVisible();
  await shot(page, '16-mobile-form');

  await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  await clearContacts(page);
});
