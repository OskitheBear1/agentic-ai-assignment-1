/**
 * Two-account privacy test — the security evidence for this assignment.
 *
 * It signs in as two real Neon Auth users and proves that User A cannot read,
 * edit, or delete User B's contacts by ANY route:
 *
 *   1. through our Node API                 (JWT verification + RLS)
 *   2. straight against the public Data API (RLS alone, backend bypassed)
 *
 * Case 2 is the one that matters most. The Data API URL is public and shipped
 * to the browser, so a determined user can call it directly with their own
 * valid token. If Row Level Security were misconfigured, this test fails.
 *
 * Requires a running backend (npm run dev) and the TEST_USER_* variables.
 * Run with: npm run test:privacy
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  API_URL,
  DATA_API_URL,
  callApi,
  callDataApi,
  userA,
  userB,
  type TestUser,
} from './support/session.js';

let alice: TestUser;
let bob: TestUser;
let contactOfBob: { id: number; name: string; user_id: string };

beforeAll(async () => {
  alice = await userA();
  bob = await userB();

  expect(alice.userId).not.toBe(bob.userId);

  const created = await callApi(bob, '/api/contacts', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Confidential Contact of User B',
      company: 'B Industries',
      priority: 'high',
      notes: 'User A must never see this.',
    }),
  });

  expect(created.status).toBe(201);
  contactOfBob = created.body.contact;
}, 60_000);

afterAll(async () => {
  if (contactOfBob?.id) {
    await callApi(bob, `/api/contacts/${contactOfBob.id}`, { method: 'DELETE' });
  }
});

describe('ownership is stamped by the database, not the client', () => {
  it("User B's contact is owned by User B", () => {
    expect(contactOfBob.user_id).toBe(bob.userId);
  });

  it('a client cannot forge user_id on create', async () => {
    const result = await callApi(alice, '/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Forged', user_id: bob.userId }),
    });

    expect(result.status).toBe(400);
    expect(JSON.stringify(result.body)).toContain('user_id');
  });
});

describe('through our Node API, User A cannot reach User B rows', () => {
  it("User A's list does not contain User B's contact", async () => {
    const result = await callApi(alice, '/api/contacts');

    expect(result.status).toBe(200);
    const ids = result.body.contacts.map((c: { id: number }) => c.id);
    expect(ids).not.toContain(contactOfBob.id);
    expect(JSON.stringify(result.body)).not.toContain('Confidential Contact');
  });

  it("User A cannot edit User B's contact", async () => {
    const result = await callApi(alice, `/api/contacts/${contactOfBob.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Hijacked by User A' }),
    });

    expect(result.status).toBe(404);
  });

  it("User A cannot delete User B's contact", async () => {
    const result = await callApi(alice, `/api/contacts/${contactOfBob.id}`, {
      method: 'DELETE',
    });

    expect(result.status).toBe(404);
  });

  it('an unauthenticated request is rejected', async () => {
    const response = await fetch(`${API_URL}/api/contacts`);
    expect(response.status).toBe(401);
  });

  it('a forged token is rejected', async () => {
    const response = await fetch(`${API_URL}/api/contacts`, {
      headers: { Authorization: 'Bearer not.a.real.token' },
    });
    expect(response.status).toBe(401);
  });
});

describe('against the public Data API directly, RLS alone still holds', () => {
  it("User A's direct SELECT cannot see User B's contact", async () => {
    const result = await callDataApi(alice, '/contacts?select=*');

    expect(result.status).toBe(200);
    const ids = result.body.map((c: { id: number }) => c.id);
    expect(ids).not.toContain(contactOfBob.id);
  });

  it("User A targeting User B's row by id gets nothing back", async () => {
    const result = await callDataApi(
      alice,
      `/contacts?id=eq.${contactOfBob.id}&select=*`,
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual([]);
  });

  it("User A's direct UPDATE affects zero rows", async () => {
    const result = await callDataApi(alice, `/contacts?id=eq.${contactOfBob.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Hijacked directly' }),
    });

    expect(result.body).toEqual([]);

    // And the row is untouched when its real owner looks at it.
    const check = await callDataApi(
      bob,
      `/contacts?id=eq.${contactOfBob.id}&select=name`,
    );
    expect(check.body[0].name).toBe('Confidential Contact of User B');
  });

  it("User A's direct DELETE affects zero rows", async () => {
    const result = await callDataApi(alice, `/contacts?id=eq.${contactOfBob.id}`, {
      method: 'DELETE',
    });

    expect(result.body).toEqual([]);

    const check = await callDataApi(
      bob,
      `/contacts?id=eq.${contactOfBob.id}&select=id`,
    );
    expect(check.body).toHaveLength(1);
  });

  it('a user cannot hand their own row to someone else (UPDATE WITH CHECK)', async () => {
    const mine = await callDataApi(alice, '/contacts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Row belonging to User A' }),
    });
    const id = mine.body[0].id;

    const attempt = await callDataApi(alice, `/contacts?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ user_id: bob.userId }),
    });

    // Either the policy rejects the write outright, or it matches no row. Both
    // are acceptable; what matters is that the row still belongs to User A.
    const after = await callDataApi(alice, `/contacts?id=eq.${id}&select=user_id`);
    expect(after.body[0]?.user_id).toBe(alice.userId);
    expect(attempt.status === 403 || attempt.body?.length === 0).toBe(true);

    await callDataApi(alice, `/contacts?id=eq.${id}`, { method: 'DELETE' });
  });

  it('an anonymous request to the Data API returns no contacts', async () => {
    const response = await fetch(`${DATA_API_URL}/contacts?select=*`);
    const body = response.ok ? await response.json() : [];
    expect(body).toEqual([]);
  });
});
