/**
 * Server-side validation, proven against the running API.
 *
 * These requests bypass the browser entirely — this is what a user with curl
 * can send. The point is that the rules hold without any help from the UI.
 *
 * Requires a running backend (npm run dev). Run with: npm run test:live
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { API_URL, callApi, userA, type TestUser } from './support/session.js';

let user: TestUser;

beforeAll(async () => {
  user = await userA();
}, 60_000);

describe('POST /api/contacts rejects invalid input', () => {
  it('rejects a missing name', async () => {
    const result = await callApi(user, '/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ company: 'Nowhere' }),
    });

    expect(result.status).toBe(400);
    expect(result.body.message).toBe('Name is required.');
  });

  it('rejects an empty name', async () => {
    const result = await callApi(user, '/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
    });

    expect(result.status).toBe(400);
    expect(result.body.message).toBe('Name is required.');
  });

  it('rejects a whitespace-only name', async () => {
    const result = await callApi(user, '/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ name: '    ' }),
    });

    expect(result.status).toBe(400);
    expect(result.body.message).toBe('Name is required.');
  });

  it('rejects an invalid priority', async () => {
    const result = await callApi(user, '/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Valid Name', priority: 'urgent' }),
    });

    expect(result.status).toBe(400);
    expect(result.body.message).toBe('Priority must be one of: high, medium, low.');
  });

  it('rejects malformed JSON with a clear message, not a crash', async () => {
    const response = await fetch(`${API_URL}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.token}`,
      },
      body: '{ not json',
    });

    expect(response.status).toBe(400);
    expect((await response.json()).message).toContain('not valid JSON');
  });

  it('accepts a valid contact, then cleans up after itself', async () => {
    const created = await callApi(user, '/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Validation Probe', priority: 'low' }),
    });

    expect(created.status).toBe(201);
    expect(created.body.contact.name).toBe('Validation Probe');
    expect(created.body.contact.priority).toBe('low');
    expect(created.body.contact.user_id).toBe(user.userId);

    const removed = await callApi(
      user,
      `/api/contacts/${created.body.contact.id}`,
      { method: 'DELETE' },
    );
    expect(removed.status).toBe(204);
  });
});

describe('PATCH /api/contacts/:id rejects invalid input', () => {
  it('rejects blanking the name and rejects a bad priority', async () => {
    const created = await callApi(user, '/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Edit Probe' }),
    });
    const { id } = created.body.contact;

    const blankName = await callApi(user, `/api/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: '  ' }),
    });
    expect(blankName.status).toBe(400);

    const badPriority = await callApi(user, `/api/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ priority: 'urgent' }),
    });
    expect(badPriority.status).toBe(400);

    await callApi(user, `/api/contacts/${id}`, { method: 'DELETE' });
  });

  it('rejects an invalid id without touching the database', async () => {
    const result = await callApi(user, '/api/contacts/not-a-number', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'x' }),
    });

    expect(result.status).toBe(400);
  });
});

describe('GET /api/contacts rejects invalid query parameters', () => {
  it('rejects an unknown sort column', async () => {
    const result = await callApi(user, '/api/contacts?sort=user_id');
    expect(result.status).toBe(400);
  });

  it('rejects an invalid priority filter', async () => {
    const result = await callApi(user, '/api/contacts?priority=urgent');
    expect(result.status).toBe(400);
  });
});
