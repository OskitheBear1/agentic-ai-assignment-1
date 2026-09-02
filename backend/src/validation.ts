import { z } from 'zod';

/**
 * Trusted server-side validation.
 *
 * This module is the first of three independent layers that reject bad data:
 *   1. Zod, here, in the Node backend        <- this file
 *   2. Row Level Security, in Postgres       <- db/policies.sql
 *   3. CHECK constraints, on the table       <- db/schema.sql
 *
 * The browser also validates, but that is a convenience for the user, not a
 * security control. A request that skips the UI entirely still lands here.
 */

/** The only three priorities the application accepts. */
export const PRIORITIES = ['high', 'medium', 'low'] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Trims a string field and turns blank-after-trim into undefined. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .transform((value) => (value === '' ? undefined : value))
    .optional();

const priority = z.enum(PRIORITIES, {
  message: 'Priority must be one of: high, medium, low.',
});

/**
 * Shape of a new contact.
 *
 * `.strict()` is deliberate: an unknown key is an error rather than something
 * silently dropped. In particular a client attempting to send `user_id` gets a
 * clear rejection instead of quietly having it ignored. Ownership is decided by
 * the database (`user_id` defaults to `auth.user_id()`), never by the request.
 */
const contactFields = {
  name: z
    .string({ message: 'Name is required.' })
    .trim()
    .min(1, 'Name is required.')
    .max(200, 'Name must be 200 characters or fewer.'),
  company: optionalText(200),
  role: optionalText(200),
  where_met: optionalText(300),
  notes: optionalText(2000),
  priority,
};

export const createContactSchema = z
  .object({ ...contactFields, priority: priority.default('medium') })
  .strict();

/**
 * Same rules for edits, but every field is optional and at least one must be
 * present. Built from the shared fields *without* the priority default, so an
 * empty body stays empty instead of being filled in with 'medium'.
 */
export const updateContactSchema = z
  .object(contactFields)
  .strict()
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

/** Sort options exposed by the list endpoint. Anything else is rejected. */
export const SORTABLE_COLUMNS = [
  'name',
  'company',
  'priority',
  'created_at',
  'updated_at',
] as const;

export const listQuerySchema = z.object({
  sort: z.enum(SORTABLE_COLUMNS).default('created_at'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  priority: priority.optional(),
  search: z.string().trim().max(200).optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

/** A single field error, shaped for the UI to display next to the input. */
export interface FieldError {
  field: string;
  message: string;
}

export interface ValidationFailure {
  ok: false;
  message: string;
  errors: FieldError[];
}

export interface ValidationSuccess<T> {
  ok: true;
  data: T;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Runs a schema and flattens Zod's output into something the frontend can
 * render directly. Never throws.
 */
export function validate<T>(
  schema: z.ZodType<T>,
  input: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(input);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  const errors: FieldError[] = result.error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : '_',
    message:
      issue.code === 'unrecognized_keys'
        ? `Unexpected field: ${(issue as { keys?: string[] }).keys?.join(', ')}. This field is not accepted.`
        : issue.message,
  }));

  return {
    ok: false,
    message: errors[0]?.message ?? 'That input is not valid.',
    errors,
  };
}
