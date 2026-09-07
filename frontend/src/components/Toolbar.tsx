import { Search } from 'lucide-react';
import type { ListParams, Priority } from '../lib/api';
import { cn } from '../lib/utils';
import { inputClass } from './ui/Field';

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

/** Search, priority filter, and sort controls. All applied server-side. */
export function Toolbar({ params, onChange, total }: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative sm:max-w-xs sm:flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={params.search ?? ''}
          onChange={(event) =>
            onChange({ search: event.target.value || undefined })
          }
          placeholder="Search name, company, role"
          aria-label="Search contacts"
          className={cn(inputClass(), 'pl-9')}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="filter-priority">
          Filter by priority
        </label>
        <select
          id="filter-priority"
          value={params.priority ?? ''}
          onChange={(event) =>
            onChange({
              priority: (event.target.value || undefined) as
                | Priority
                | undefined,
            })
          }
          className={cn(inputClass(), 'w-auto')}
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="sort-by">
          Sort by
        </label>
        <select
          id="sort-by"
          value={params.sort}
          onChange={(event) =>
            onChange({ sort: event.target.value as ListParams['sort'] })
          }
          className={cn(inputClass(), 'w-auto')}
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              Sort: {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() =>
            onChange({ direction: params.direction === 'asc' ? 'desc' : 'asc' })
          }
          className="h-10 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-canvas"
        >
          {params.direction === 'asc' ? 'Ascending' : 'Descending'}
        </button>

        <span className="text-sm whitespace-nowrap text-muted">
          {total} {total === 1 ? 'contact' : 'contacts'}
        </span>
      </div>
    </div>
  );
}
