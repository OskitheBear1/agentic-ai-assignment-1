import { expect, test } from '@playwright/test';
import { account, addContact, clearContacts, shot, signIn, signOut } from './helpers';

/**
 * Evidence: User A cannot see User B's contacts.
 *
 * Two real accounts, one browser. B saves something private, signs out; A signs
 * in and cannot see it. The screenshots are the side-by-side proof for the
 * README. The stronger, non-visual proof — A attacking the Data API directly —
 * is in backend/tests/privacy.test.ts.
 */
test.describe.configure({ mode: 'serial' });

test('User A cannot see User B contacts', async ({ page }) => {
  const userA = account('A');
  const userB = account('B');

  // User B saves a private contact.
  await signIn(page, userB);
  await clearContacts(page);
  await addContact(page, {
    name: 'Confidential Contact of User B',
    company: 'B Industries',
    priority: 'high',
    notes: 'User A must never see this.',
  });
  await expect(page.getByText('Confidential Contact of User B')).toBeVisible();
  await shot(page, '13-user-b-contacts');
  await signOut(page);

  // User A sees their own list only.
  await signIn(page, userA);
  await expect(page.getByText(userA.email)).toBeVisible();
  await expect(page.getByText('Confidential Contact of User B')).toBeHidden();
  await expect(page.getByText('B Industries')).toBeHidden();
  await shot(page, '14-user-a-cannot-see-user-b');

  await signOut(page);

  // Clean up as User B.
  await signIn(page, userB);
  await clearContacts(page);
});
