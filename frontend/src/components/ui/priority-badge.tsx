import type { Priority } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

/** Maps a contact's priority onto a shadcn/ui Badge variant. */
const variants: Record<Priority, 'destructive' | 'secondary' | 'outline'> = {
  high: 'destructive',
  medium: 'secondary',
  low: 'outline',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge variant={variants[priority]} className="capitalize">
      {priority}
    </Badge>
  );
}
