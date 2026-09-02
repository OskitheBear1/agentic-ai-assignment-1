import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

/** Skeleton rows shown while the first fetch is in flight. */
export function LoadingState({ label = 'Loading contacts…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-3 py-16 text-muted"
    >
      <Loader2 className="size-6 animate-spin" aria-hidden />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Shown when the request succeeded but there is nothing to display yet. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Shown when a request failed, with a way to recover. */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto my-10 flex max-w-md flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center"
    >
      <AlertCircle className="size-6 text-red-600" aria-hidden />
      <p className="text-sm font-medium text-red-800">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-red-700 underline underline-offset-4 hover:text-red-900"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** Transient confirmation after a successful write. */
export function Toast({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex w-fit items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white shadow-lg sm:inset-x-auto sm:right-6"
    >
      <CheckCircle2 className="size-4 text-emerald-400" aria-hidden />
      {message}
    </div>
  );
}
