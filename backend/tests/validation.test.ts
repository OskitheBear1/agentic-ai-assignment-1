import { describe, expect, it } from 'vitest';
import { extractBearerToken } from '../src/auth.js';
import {
  createContactSchema,
  listQuerySchema,
  updateContactSchema,
  validate,
} from '../src/validation.js';

/**
 * These tests cover the trusted server-side validation layer — the rules that
 * apply no matter what the browser sends. They run without a database or a
 * network connection.
 */

describe('createContactSchema — required fields', () => {
  it('accepts a complete, valid contact', () => {
    const result = validate(createContactSchema, {
      name: 'Ada Lovelace',
      company: 'Analytical Engines',
      role: 'Head of Programs',
      where_met: 'Haas Tech Club mixer',
      notes: 'Follow up about her fellowship.',
      priority: 'high',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Ada Lovelace');
      expect(result.data.priority).toBe('high');
    }
  });

  it('rejects a missing name', () => {
    const result = validate(createContactSchema, { priority: 'low' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('Name is required.');
      expect(result.errors[0]?.field).toBe('name');
    }
  });

  it('rejects an empty name', () => {
    const result = validate(createContactSchema, { name: '' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('Name is required.');
    }
  });

  it('rejects a name that is only whitespace', () => {
    const result = validate(createContactSchema, { name: '   \t  ' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('Name is required.');
    }
  });

  it('trims surrounding whitespace from the name', () => {
    const result = validate(createContactSchema, { name: '  Grace Hopper  ' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Grace Hopper');
    }
  });

  it('rejects a name longer than 200 characters', () => {
    const result = validate(createContactSchema, { name: 'a'.repeat(201) });

    expect(result.ok).toBe(false);
  });
});

describe('createContactSchema — priority', () => {
  it.each(['high', 'medium', 'low'] as const)('accepts "%s"', (priority) => {
    const result = validate(createContactSchema, { name: 'Test', priority });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.priority).toBe(priority);
    }
  });

  it.each(['urgent', 'HIGH', 'critical', '', 'none'])(
    'rejects invalid priority "%s"',
    (priority) => {
      const result = validate(createContactSchema, { name: 'Test', priority });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toBe(
          'Priority must be one of: high, medium, low.',
        );
      }
    },
  );

  it('rejects a non-string priority', () => {
    const result = validate(createContactSchema, { name: 'Test', priority: 1 });

    expect(result.ok).toBe(false);
  });

  it('defaults to medium when priority is omitted', () => {
    const result = validate(createContactSchema, { name: 'Test' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.priority).toBe('medium');
    }
  });
});

describe('createContactSchema — ownership cannot be forged', () => {
  it('rejects a body that tries to set user_id', () => {
    const result = validate(createContactSchema, {
      name: 'Impersonation attempt',
      user_id: 'some-other-users-id',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('user_id');
    }
  });

  it('rejects a body that tries to set id or created_at', () => {
    expect(validate(createContactSchema, { name: 'x', id: 99 }).ok).toBe(false);
    expect(
      validate(createContactSchema, { name: 'x', created_at: '2020-01-01' }).ok,
    ).toBe(false);
  });
});

describe('updateContactSchema', () => {
  it('accepts a single-field edit', () => {
    const result = validate(updateContactSchema, { priority: 'low' });
    expect(result.ok).toBe(true);
  });

  it('rejects an empty update', () => {
    const result = validate(updateContactSchema, {});
    expect(result.ok).toBe(false);
  });

  it('still rejects an invalid priority on edit', () => {
    const result = validate(updateContactSchema, { priority: 'urgent' });
    expect(result.ok).toBe(false);
  });

  it('still rejects blanking the name', () => {
    const result = validate(updateContactSchema, { name: '  ' });
    expect(result.ok).toBe(false);
  });

  it('rejects reassigning ownership on edit', () => {
    const result = validate(updateContactSchema, { user_id: 'someone-else' });
    expect(result.ok).toBe(false);
  });
});

describe('listQuerySchema', () => {
  it('applies sensible defaults', () => {
    const result = validate(listQuerySchema, {});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.sort).toBe('created_at');
      expect(result.data.direction).toBe('desc');
    }
  });

  it('rejects an unknown sort column, so it can never reach SQL', () => {
    const result = validate(listQuerySchema, { sort: 'user_id; DROP TABLE' });
    expect(result.ok).toBe(false);
  });

  it('rejects an invalid sort direction', () => {
    const result = validate(listQuerySchema, { direction: 'sideways' });
    expect(result.ok).toBe(false);
  });

  it('rejects an invalid priority filter', () => {
    const result = validate(listQuerySchema, { priority: 'urgent' });
    expect(result.ok).toBe(false);
  });
});

describe('extractBearerToken', () => {
  it('pulls the token out of a well-formed header', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('is case-insensitive on the scheme', () => {
    expect(extractBearerToken('bearer abc')).toBe('abc');
  });

  it.each([undefined, '', 'abc.def.ghi', 'Basic abc', 'Bearer '])(
    'returns null for %s',
    (header) => {
      expect(extractBearerToken(header)).toBeNull();
    },
  );
});
