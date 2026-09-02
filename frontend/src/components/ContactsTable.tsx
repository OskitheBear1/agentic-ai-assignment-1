import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import type { Contact, ListParams } from '../lib/api';
import { cn, formatDate } from '../lib/utils';
import { PriorityBadge } from './ui/Badge';

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
 *   - a table on screens sm and up
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
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              {COLUMNS.map((column) => {
                const active = sort === column.key;
                return (
                  <th key={column.key} scope="col" className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      aria-sort={
                        active
                          ? direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                      className={cn(
                        'inline-flex items-center gap-1 font-semibold transition-colors',
                        active ? 'text-ink' : 'text-muted hover:text-ink',
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
                  </th>
                );
              })}
              <th scope="col" className="px-4 py-3 font-semibold text-muted">
                Where you met
              </th>
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr
                key={contact.id}
                className="border-b border-line/60 last:border-0 hover:bg-canvas"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{contact.name}</div>
                  {contact.role && (
                    <div className="text-xs text-muted">{contact.role}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{contact.company ?? '—'}</td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={contact.priority} />
                </td>
                <td className="px-4 py-3 text-muted">
                  {formatDate(contact.created_at)}
                </td>
                <td className="max-w-[16rem] truncate px-4 py-3 text-muted">
                  {contact.where_met ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    contact={contact}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="divide-y divide-line sm:hidden">
        {contacts.map((contact) => (
          <li key={contact.id} className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{contact.name}</p>
                <p className="truncate text-sm text-muted">
                  {[contact.role, contact.company].filter(Boolean).join(' · ') ||
                    '—'}
                </p>
              </div>
              <PriorityBadge priority={contact.priority} />
            </div>

            {contact.where_met && (
              <p className="mt-2 text-sm text-muted">Met at {contact.where_met}</p>
            )}
            {contact.notes && (
              <p className="mt-1 line-clamp-2 text-sm text-muted">
                {contact.notes}
              </p>
            )}

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted">
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
      <button
        type="button"
        onClick={() => onEdit(contact)}
        aria-label={`Edit ${contact.name}`}
        className="rounded-lg p-2 text-muted transition-colors hover:bg-brand-soft hover:text-brand"
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(contact)}
        aria-label={`Delete ${contact.name}`}
        className="rounded-lg p-2 text-muted transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
