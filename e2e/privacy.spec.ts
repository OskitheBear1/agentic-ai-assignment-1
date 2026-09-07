import { expect, test } from '@playwright/test';
import {
  account,
  addContact,
  clearContacts,
  shot,
  signIn,
  signOut,
  visibleText,
  waitForList,
} from './helpers';

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
  await expect(visibleText(page, 'Confidential Contact of User B')).toBeVisible();
  await waitForList(page);
  await shot(page, '13-user-b-contacts');
  await signOut(page);

  // User A sees their own list only.
  await signIn(page, userA);
  await expect(visibleText(page, userA.email)).toBeVisible();

  // Wait for the list to actually finish loading — a screenshot of a spinner
  // proves nothing about what User A can or cannot see.
  await waitForList(page);

  await expect(visibleText(page, 'Confidential Contact of User B')).toHaveCount(0);
  await expect(visibleText(page, 'B Industries')).toHaveCount(0);
  await shot(page, '14-user-a-cannot-see-user-b');

  await signOut(page);

  // Clean up as User B.
  await signIn(page, userB);
  await clearContacts(page);
});
