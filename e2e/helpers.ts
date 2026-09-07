import { expect, type Locator, type Page } from '@playwright/test';
import './env';

export const DOCS = 'docs';

export interface Account {
  email: string;
  password: string;
}

export function account(which: 'A' | 'B'): Account {
  const email = process.env[`TEST_USER_${which}_EMAIL`];
  const password = process.env[`TEST_USER_${which}_PASSWORD`];

  if (!email || !password) {
    throw new Error(
      `Set TEST_USER_${which}_EMAIL and TEST_USER_${which}_PASSWORD in .env.local. See .env.example.`,
    );
  }

  return { email, password };
}

/**
 * Signs in, creating the account first if it does not exist yet.
 *
 * "Signed in" is detected by the Sign out button, NOT by the "Networking
 * Tracker" heading — that heading appears on the sign-in screen too, so keying
 * off it would report success while still signed out.
 */
export async function signIn(page: Page, user: Account): Promise<void> {
  await page.goto('/');

  const signedIn = page.getByRole('button', { name: 'Sign out' });
  const signInHeading = page.getByRole('heading', { name: 'Sign in' });

  // Already signed in from an earlier test in this worker.
  await expect(signedIn.or(signInHeading).first()).toBeVisible();
  if (await signedIn.isVisible()) return;

  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  const failure = page.getByRole('alert');
  await expect(signedIn.or(failure).first()).toBeVisible();

  if (await signedIn.isVisible()) return;

  // No account yet — create one.
  await page.getByRole('button', { name: 'Create one' }).click();
  await page.getByLabel('Name').fill(user.email.split('@')[0]);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(signedIn).toBeVisible({ timeout: 20_000 });
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
}

/**
 * Text as the user actually sees it.
 *
 * The desktop table and the mobile card list are BOTH in the DOM — one is
 * hidden with CSS at any given breakpoint — so a plain getByText matches twice
 * and trips strict mode. Filtering to visible picks whichever layout is live.
 */
export function visibleText(page: Page, text: string) {
  return page.getByText(text).filter({ visible: true });
}

/**
 * Picks a value from a shadcn/ui Select.
 *
 * These are not native <select> elements — they are button triggers that open a
 * listbox — so Playwright's selectOption() does not apply. Click the trigger,
 * then click the option by its accessible name.
 */
export async function chooseOption(
  scope: Page | Locator,
  triggerLabel: string | RegExp,
  optionName: string | RegExp,
): Promise<void> {
  const page = 'page' in scope ? (scope as Locator).page() : (scope as Page);
  await scope.getByLabel(triggerLabel).click();
  // The listbox portals to the document body, so look for the option on the page.
  await page.getByRole('option', { name: optionName, exact: true }).click();
}

/**
 * The open create/edit dialog.
 *
 * Form fields are looked up inside it rather than on the whole page, because
 * "Priority" also matches the toolbar's filter dropdown.
 */
export function dialog(page: Page) {
  return page.getByRole('dialog');
}

/** Fills and submits the add-contact dialog. */
export async function addContact(
  page: Page,
  contact: {
    name: string;
    company?: string;
    role?: string;
    whereMet?: string;
    notes?: string;
    priority?: 'high' | 'medium' | 'low';
  },
): Promise<void> {
  await page.getByRole('button', { name: /^(Add contact|Add)$/ }).first().click();

  const form = dialog(page);
  await form.getByLabel('Name').fill(contact.name);
  if (contact.company) await form.getByLabel('Company').fill(contact.company);
  if (contact.role) await form.getByLabel('Role').fill(contact.role);
  if (contact.whereMet)
    await form.getByLabel('Where you met').fill(contact.whereMet);
  if (contact.notes) await form.getByLabel('Notes').fill(contact.notes);
  if (contact.priority) {
    const label = contact.priority.charAt(0).toUpperCase() + contact.priority.slice(1);
    await chooseOption(form, 'Priority', label);
  }

  await form.getByRole('button', { name: 'Add contact' }).click();
  await expect(page.getByText('Contact added.')).toBeVisible();
}

/**
 * Deletes every contact so each spec starts from a known state.
 *
 * Waits for the list to finish loading first — otherwise it can run against an
 * empty skeleton, conclude there is nothing to delete, and leave rows behind
 * for the next spec to trip over.
 */
export async function clearContacts(page: Page): Promise<void> {
  await waitForList(page);

  for (;;) {
    const deleteButton = page.getByRole('button', { name: /^Delete .+/ }).first();
    if ((await deleteButton.count()) === 0) break;

    await deleteButton.click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Contact deleted.')).toBeVisible();
    await expect(page.getByText('Contact deleted.')).toBeHidden({ timeout: 5000 });
  }

  await expect(page.getByText(/No contacts yet|No matching contacts/)).toBeVisible();
}

/** Resolves once the contact list has loaded — either rows or the empty state. */
export async function waitForList(page: Page): Promise<void> {
  await expect(
    page
      .getByText(/No contacts yet|No matching contacts/)
      .or(page.getByRole('button', { name: /^Delete .+/ }).first()),
  ).toBeVisible();
}

/** Screenshot helper that names files predictably for the README. */
export async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${DOCS}/${name}.png`, fullPage: false });
}
