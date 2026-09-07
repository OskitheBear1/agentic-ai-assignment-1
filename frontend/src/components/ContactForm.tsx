import { useState, type FormEvent } from 'react';
import { ApiError, type Contact, type ContactInput, type Priority } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

const priorityLabel = (priority: string) =>
  priority.charAt(0).toUpperCase() + priority.slice(1);

interface ContactFormProps {
  initial?: Contact;
  submitLabel: string;
  onSubmit: (input: ContactInput) => Promise<void>;
  onCancel: () => void;
}

/**
 * Create/edit form, built from shadcn/ui primitives.
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
            error.fieldErrors.map((f) => [f.field, f.message]),
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
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm font-medium"
        >
          {formError}
        </p>
      )}

      <FormField label="Name" htmlFor="name" required error={errors.name}>
        <Input
          id="name"
          name="name"
          value={values.name}
          onChange={(event) => set('name', event.target.value)}
          placeholder="Ada Lovelace"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'name-error' : undefined}
          autoFocus
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Company" htmlFor="company" error={errors.company}>
          <Input
            id="company"
            value={values.company}
            onChange={(event) => set('company', event.target.value)}
            placeholder="Bain & Company"
            aria-invalid={Boolean(errors.company)}
          />
        </FormField>

        <FormField label="Role" htmlFor="role" error={errors.role}>
          <Input
            id="role"
            value={values.role}
            onChange={(event) => set('role', event.target.value)}
            placeholder="Associate Consultant"
            aria-invalid={Boolean(errors.role)}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Where you met"
          htmlFor="where_met"
          error={errors.where_met}
        >
          <Input
            id="where_met"
            value={values.where_met}
            onChange={(event) => set('where_met', event.target.value)}
            placeholder="Haas Consulting Club mixer"
            aria-invalid={Boolean(errors.where_met)}
          />
        </FormField>

        <FormField
          label="Priority"
          htmlFor="priority"
          error={errors.priority}
          hint="How soon you want to follow up."
        >
          <Select
            value={values.priority}
            onValueChange={(value) => set('priority', value as Priority)}
          >
            <SelectTrigger id="priority" className="w-full">
              {/* base-ui renders the raw value unless given a label mapping. */}
              <SelectValue>{(value) => priorityLabel(String(value))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priorityLabel(priority)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField label="Notes" htmlFor="notes" error={errors.notes}>
        <Textarea
          id="notes"
          rows={3}
          value={values.notes}
          onChange={(event) => set('notes', event.target.value)}
          placeholder="Talked about her fellowship. Send the article on impact investing."
          aria-invalid={Boolean(errors.notes)}
        />
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
