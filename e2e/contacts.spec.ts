import { expect, test } from '@playwright/test';
import { account, addContact, clearContacts, dialog, shot, signIn, visibleText } from './helpers';

/**
 * Evidence: create, view, edit, delete, sort, filter — and the data survives a
 * browser refresh because it lives in Neon Postgres, not in the page.
 */
test.describe.configure({ mode: 'serial' });

test('create, view, edit, delete, and survive a refresh', async ({ page }) => {
  await signIn(page, account('A'));
  await clearContacts(page);

  // Empty state
  await expect(page.getByText('No contacts yet')).toBeVisible();
  await shot(page, '04-empty-state');

  // Create
  await addContact(page, {
    name: 'Ada Lovelace',
    company: 'Analytical Engines',
    role: 'Head of Programs',
    whereMet: 'Haas Tech Club mixer',
    notes: 'Send her the impact investing article.',
    priority: 'high',
  });
  await expect(visibleText(page, 'Ada Lovelace')).toBeVisible();
  await shot(page, '05-contact-created');

  // Survives a refresh — proof it is persisted server-side.
  await page.reload();
  await expect(visibleText(page, 'Ada Lovelace')).toBeVisible();
  await expect(visibleText(page, 'Analytical Engines')).toBeVisible();
  await shot(page, '06-survives-refresh');

  // Edit
  await page.getByRole('button', { name: 'Edit Ada Lovelace' }).click();
  await dialog(page).getByLabel('Company').fill('Babbage & Co');
  await dialog(page).getByLabel('Priority').selectOption('low');
  await dialog(page).getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  await expect(visibleText(page, 'Babbage & Co')).toBeVisible();
  await shot(page, '07-contact-edited');

  // Delete
  await page.getByRole('button', { name: 'Delete Ada Lovelace' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Contact deleted.')).toBeVisible();
  await expect(visibleText(page, 'Ada Lovelace')).toHaveCount(0);
  await shot(page, '08-contact-deleted');
});

test('sort and filter', async ({ page }) => {
  await signIn(page, account('A'));
  await clearContacts(page);

  await addContact(page, { name: 'Zara Okafor', company: 'Vega', priority: 'low' });
  await addContact(page, { name: 'Ada Lovelace', company: 'Babbage', priority: 'high' });
  await addContact(page, { name: 'Marcus Chen', company: 'Northwind', priority: 'medium' });

  // Sort by name ascending via the column header.
  await page.getByRole('button', { name: 'Name', exact: true }).click();
  const firstRow = page.locator('tbody tr').first();
  await expect(firstRow).toContainText('Ada Lovelace');
  await shot(page, '09-sorted-by-name');

  // Filter to high priority only.
  await page.getByLabel('Filter by priority').selectOption('high');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(visibleText(page, 'Ada Lovelace')).toBeVisible();
  await shot(page, '10-filtered-high-priority');

  // Search.
  await page.getByLabel('Filter by priority').selectOption('');
  await page.getByLabel('Search contacts').fill('Northwind');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(visibleText(page, 'Marcus Chen')).toBeVisible();
  await shot(page, '11-search-results');

  await page.getByLabel('Search contacts').fill('');
  await clearContacts(page);
});
