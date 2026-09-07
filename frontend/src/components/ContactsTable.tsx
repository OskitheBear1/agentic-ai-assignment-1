import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import type { Contact, ListParams } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from '@/components/ui/priority-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ContactsTableProps {
  contacts: Contact[];
  sort: ListParams['sort'];
  direction: ListParams['direction'];
  onSort: (column: ListParams['sort']) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}

const COLUMNS: Array<{ key: ListParams['sort']; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'company', label: 'Company' },
  { key: 'priority', label: 'Priority' },
  { key: 'created_at', label: 'Added' },
];

/**
 * Two presentations of the same data:
 *   - a shadcn/ui Table on screens sm and up
 *   - stacked cards below that, because a six-column table is unusable on a phone
 *
 * Sorting is triggered here but performed in Postgres, so it stays correct as
 * the list grows past what is on screen.
 */
export function ContactsTable({
  contacts,
  sort,
  direction,
  onSort,
  onEdit,
  onDelete,
}: ContactsTableProps) {
  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column) => {
                const active = sort === column.key;
                return (
                  <TableHead
                    key={column.key}
                    aria-sort={
                      active
                        ? direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      className={cn(
                        'inline-flex items-center gap-1 font-semibold transition-colors',
                        active
                          ? 'text-foreground'
                          : 'hover:text-foreground',
                      )}
                    >
                      {column.label}
                      {active &&
                        (direction === 'asc' ? (
                          <ArrowUp className="size-3.5" aria-hidden />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden />
                        ))}
                    </button>
                  </TableHead>
                );
              })}
              <TableHead>Where you met</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <div className="text-foreground font-medium">
                    {contact.name}
                  </div>
                  {contact.role && (
                    <div className="text-muted-foreground text-xs">
                      {contact.role}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {contact.company ?? '—'}
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={contact.priority} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(contact.created_at)}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[16rem] truncate">
                  {contact.where_met ?? '—'}
                </TableCell>
                <TableCell>
                  <RowActions
                    contact={contact}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <ul className="divide-border divide-y sm:hidden">
        {contacts.map((contact) => (
          <li key={contact.id} className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-foreground truncate font-medium">
                  {contact.name}
                </p>
                <p className="text-muted-foreground truncate text-sm">
                  {[contact.role, contact.company].filter(Boolean).join(' · ') ||
                    '—'}
                </p>
              </div>
              <PriorityBadge priority={contact.priority} />
            </div>

            {contact.where_met && (
              <p className="text-muted-foreground mt-2 text-sm">
                Met at {contact.where_met}
              </p>
            )}
            {contact.notes && (
              <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                {contact.notes}
              </p>
            )}

            <div className="mt-3 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Added {formatDate(contact.created_at)}
              </span>
              <RowActions
                contact={contact}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function RowActions({
  contact,
  onEdit,
  onDelete,
}: {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(contact)}
        aria-label={`Edit ${contact.name}`}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(contact)}
        aria-label={`Delete ${contact.name}`}
        className="hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
