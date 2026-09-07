import { Search } from 'lucide-react';
import type { ListParams, Priority } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ToolbarProps {
  params: ListParams;
  onChange: (next: Partial<ListParams>) => void;
  total: number;
}

const SORTS: Array<{ value: ListParams['sort']; label: string }> = [
  { value: 'created_at', label: 'Date added' },
  { value: 'name', label: 'Name' },
  { value: 'company', label: 'Company' },
  { value: 'priority', label: 'Priority' },
  { value: 'updated_at', label: 'Last updated' },
];

const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

/** base-ui's Select renders the raw value, so triggers need a label lookup. */
const priorityFilterLabel = (value: string) =>
  value === 'all'
    ? 'All priorities'
    : value.charAt(0).toUpperCase() + value.slice(1);

const sortLabel = (value: string) =>
  `Sort: ${SORTS.find((option) => option.value === value)?.label ?? value}`;

/** Search, priority filter, and sort controls. All applied server-side. */
export function Toolbar({ params, onChange, total }: ToolbarProps) {
  return (
    <div className="border-border flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative sm:max-w-xs sm:flex-1">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          value={params.search ?? ''}
          onChange={(event) =>
            onChange({ search: event.target.value || undefined })
          }
          placeholder="Search name, company, role"
          aria-label="Search contacts"
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="filter-priority" className="sr-only">
          Filter by priority
        </Label>
        <Select
          value={params.priority ?? 'all'}
          onValueChange={(value) =>
            onChange({
              priority: value === 'all' ? undefined : (value as Priority),
            })
          }
        >
          <SelectTrigger id="filter-priority" className="w-auto">
            <SelectValue>
              {(value) => priorityFilterLabel(String(value))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Label htmlFor="sort-by" className="sr-only">
          Sort by
        </Label>
        <Select
          value={params.sort}
          onValueChange={(value) =>
            onChange({ sort: value as ListParams['sort'] })
          }
        >
          <SelectTrigger id="sort-by" className="w-auto">
            <SelectValue>{(value) => sortLabel(String(value))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() =>
            onChange({ direction: params.direction === 'asc' ? 'desc' : 'asc' })
          }
        >
          {params.direction === 'asc' ? 'Ascending' : 'Descending'}
        </Button>

        <span className="text-muted-foreground text-sm whitespace-nowrap">
          {total} {total === 1 ? 'contact' : 'contacts'}
        </span>
      </div>
    </div>
  );
}
