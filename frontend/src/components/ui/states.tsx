import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/** Shown while the first fetch is in flight. */
export function LoadingState({ label = 'Loading contacts…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="text-muted-foreground flex flex-col items-center gap-3 py-16"
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
      <h3 className="text-foreground text-base font-semibold">{title}</h3>
      <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
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
    <div className="px-6 py-10">
      <Alert variant="destructive" className="mx-auto max-w-md">
        <AlertCircle className="size-4" aria-hidden />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          {message}
          {onRetry && (
            <Button
              variant="link"
              onClick={onRetry}
              className="text-destructive h-auto p-0"
            >
              Try again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}

/** Transient confirmation after a successful write. */
export function Toast({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-foreground text-background fixed inset-x-4 bottom-4 z-50 mx-auto flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg sm:inset-x-auto sm:right-6"
    >
      <CheckCircle2 className="size-4 text-emerald-400" aria-hidden />
      {message}
    </div>
  );
}
