import { useState, type FormEvent } from 'react';
import {
  ApiError,
  type Contact,
  type ContactInput,
  type Priority,
} from '../lib/api';
import { Button } from './ui/Button';
import { Field, inputClass } from './ui/Field';

const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

interface ContactFormProps {
  initial?: Contact;
  submitLabel: string;
  onSubmit: (input: ContactInput) => Promise<void>;
  onCancel: () => void;
}

/**
 * Create/edit form.
 *
 * Client-side checks here are a convenience — they give instant feedback. The
 * authoritative rules live in the Node backend (Zod) and in Postgres (CHECK
 * constraints); when the server rejects something, its message is shown against
 * the offending field rather than replaced with a generic one.
 */
export function ContactForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: ContactFormProps) {
  const [values, setValues] = useState<ContactInput>({
    name: initial?.name ?? '',
    company: initial?.company ?? '',
    role: initial?.role ?? '',
    where_met: initial?.where_met ?? '',
    notes: initial?.notes ?? '',
    priority: initial?.priority ?? 'medium',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ContactInput>(key: K, value: ContactInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors(({ [key as string]: _removed, ...rest }) => rest);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (values.name.trim() === '') {
      setErrors({ name: 'Name is required.' });
      return;
    }

    setSaving(true);
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.length > 0) {
        setErrors(
          Object.fromEntries(
            error.fieldErrors.map((fieldError) => [
              fieldError.field,
              fieldError.message,
            ]),
          ),
        );
        setFormError(error.message);
      } else {
        setFormError(
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
        >
          {formError}
        </p>
      )}

      <Field label="Name" htmlFor="name" required error={errors.name}>
        <input
          id="name"
          name="name"
          value={values.name}
          onChange={(event) => set('name', event.target.value)}
          className={inputClass(Boolean(errors.name))}
          placeholder="Ada Lovelace"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'name-error' : undefined}
          autoFocus
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" htmlFor="company" error={errors.company}>
          <input
            id="company"
            value={values.company}
            onChange={(event) => set('company', event.target.value)}
            className={inputClass(Boolean(errors.company))}
            placeholder="Bain & Company"
          />
        </Field>

        <Field label="Role" htmlFor="role" error={errors.role}>
          <input
            id="role"
            value={values.role}
            onChange={(event) => set('role', event.target.value)}
            className={inputClass(Boolean(errors.role))}
            placeholder="Associate Consultant"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Where you met" htmlFor="where_met" error={errors.where_met}>
          <input
            id="where_met"
            value={values.where_met}
            onChange={(event) => set('where_met', event.target.value)}
            className={inputClass(Boolean(errors.where_met))}
            placeholder="Haas Consulting Club mixer"
          />
        </Field>

        <Field
          label="Priority"
          htmlFor="priority"
          error={errors.priority}
          hint="How soon you want to follow up."
        >
          <select
            id="priority"
            value={values.priority}
            onChange={(event) =>
              set('priority', event.target.value as Priority)
            }
            className={inputClass(Boolean(errors.priority))}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Notes" htmlFor="notes" error={errors.notes}>
        <textarea
          id="notes"
          rows={3}
          value={values.notes}
          onChange={(event) => set('notes', event.target.value)}
          className={inputClass(Boolean(errors.notes))}
          placeholder="Talked about her fellowship. Send the article on impact investing."
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
