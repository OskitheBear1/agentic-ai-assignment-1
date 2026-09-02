import { expect, type Page } from '@playwright/test';
import 'dotenv/config';

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

/** Signs in, creating the account first if it does not exist yet. */
export async function signIn(page: Page, user: Account): Promise<void> {
  await page.goto('/');

  // Already signed in from a previous test in this worker.
  if (await page.getByRole('button', { name: 'Sign out' }).isVisible().catch(() => false)) {
    return;
  }

  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  const signedIn = page.getByRole('heading', { name: 'Networking Tracker' });
  const failed = page.getByRole('alert');

  await expect(signedIn.or(failed).first()).toBeVisible();

  // No account yet — create one, then continue.
  if (await failed.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Create one' }).click();
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: 'Create account' }).click();
  }

  await expect(page.getByRole('button', { name: /Add contact|Add/ })).toBeVisible();
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
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
  await page.getByRole('button', { name: /^Add contact$|^Add$/ }).first().click();

  await page.getByLabel('Name').fill(contact.name);
  if (contact.company) await page.getByLabel('Company').fill(contact.company);
  if (contact.role) await page.getByLabel('Role').fill(contact.role);
  if (contact.whereMet)
    await page.getByLabel('Where you met').fill(contact.whereMet);
  if (contact.notes) await page.getByLabel('Notes').fill(contact.notes);
  if (contact.priority)
    await page.getByLabel('Priority').selectOption(contact.priority);

  await page.getByRole('button', { name: 'Add contact' }).last().click();
  await expect(page.getByText('Contact added.')).toBeVisible();
}

/** Deletes every contact so each spec starts from a known state. */
export async function clearContacts(page: Page): Promise<void> {
  for (;;) {
    const deleteButton = page.getByRole('button', { name: /^Delete / }).first();
    if (!(await deleteButton.isVisible().catch(() => false))) return;

    await deleteButton.click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Contact deleted.')).toBeVisible();
  }
}

/** Screenshot helper that names files predictably for the README. */
export async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${DOCS}/${name}.png`, fullPage: false });
}
