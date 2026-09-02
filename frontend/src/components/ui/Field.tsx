import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

/**
 * A labelled form control with an accessible error message.
 *
 * The error is wired with aria-describedby and role="alert" so a screen reader
 * announces it, rather than it only being visible as red text.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-red-600" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-xs font-medium text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass = (hasError?: boolean) =>
  cn(
    'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink',
    'placeholder:text-muted/70',
    'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand',
    hasError ? 'border-red-500' : 'border-line',
  );
