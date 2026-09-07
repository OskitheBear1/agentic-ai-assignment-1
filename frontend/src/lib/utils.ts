export { cn } from 'cn';

/** Formats an ISO timestamp for display in the contact list. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
