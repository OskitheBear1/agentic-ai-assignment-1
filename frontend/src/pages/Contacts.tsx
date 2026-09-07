import { useCallback, useEffect, useRef, useState } from 'react';
import { LogOut, Plus } from 'lucide-react';
import {
  contactsApi,
  type Contact,
  type ContactInput,
  type ListParams,
} from '@/lib/api';
import { auth, clearAccessToken } from '@/lib/neon';
import { ContactForm } from '@/components/ContactForm';
import { ContactsTable } from '@/components/ContactsTable';
import { Toolbar } from '@/components/Toolbar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Toast,
} from '@/components/ui/states';

type Dialog =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; contact: Contact }
  | { kind: 'delete'; contact: Contact };

export function Contacts({ userEmail }: { userEmail: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>({ kind: 'closed' });
  const [toast, setToast] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [params, setParams] = useState<ListParams>({
    sort: 'created_at',
    direction: 'desc',
  });

  // Debounce the search box so typing does not fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState<string | undefined>();
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(params.search), 250);
    return () => clearTimeout(timer);
  }, [params.search]);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { contacts: rows } = await contactsApi.list({
        ...params,
        search: debouncedSearch,
      });
      setContacts(rows);
      setStatus('ready');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not load your contacts.',
      );
      setStatus('error');
    }
  }, [params.sort, params.direction, params.priority, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  // Auto-dismiss the success toast.
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function flash(message: string) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  async function handleCreate(input: ContactInput) {
    await contactsApi.create(input);
    setDialog({ kind: 'closed' });
    flash('Contact added.');
    await load();
  }

  async function handleUpdate(id: number, input: ContactInput) {
    await contactsApi.update(id, input);
    setDialog({ kind: 'closed' });
    flash('Changes saved.');
    await load();
  }

  async function handleDelete(contact: Contact) {
    setDeleting(true);
    try {
      await contactsApi.remove(contact.id);
      setDialog({ kind: 'closed' });
      flash('Contact deleted.');
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not delete that contact.',
      );
      setStatus('error');
      setDialog({ kind: 'closed' });
    } finally {
      setDeleting(false);
    }
  }

  const isFiltered = Boolean(params.priority || debouncedSearch);

  return (
    <div className="min-h-dvh">
      <header className="bg-card border-border border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-ink">
              Networking Tracker
            </h1>
            <p className="text-muted-foreground truncate text-xs">{userEmail}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => setDialog({ kind: 'create' })}>
              <Plus className="size-4" aria-hidden />
              <span className="hidden sm:inline">Add contact</span>
              <span className="sm:hidden">Add</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                clearAccessToken();
                void auth.signOut();
              }}
              aria-label="Sign out"
            >
              <LogOut className="size-4" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="bg-card border-border overflow-hidden rounded-2xl border">
          <Toolbar
            params={params}
            onChange={(next) => setParams((current) => ({ ...current, ...next }))}
            total={contacts.length}
          />

          {status === 'loading' && <LoadingState />}

          {status === 'error' && (
            <ErrorState
              message={error ?? 'Something went wrong.'}
              onRetry={() => void load()}
            />
          )}

          {status === 'ready' && contacts.length === 0 && (
            <EmptyState
              title={isFiltered ? 'No matching contacts' : 'No contacts yet'}
              description={
                isFiltered
                  ? 'Try a different search term or clear the priority filter.'
                  : 'Add the first person you want to stay in touch with. Everything you save here is private to your account.'
              }
              action={
                isFiltered ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setParams((current) => ({
                        ...current,
                        priority: undefined,
                        search: undefined,
                      }))
                    }
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button onClick={() => setDialog({ kind: 'create' })}>
                    <Plus className="size-4" aria-hidden />
                    Add your first contact
                  </Button>
                )
              }
            />
          )}

          {status === 'ready' && contacts.length > 0 && (
            <ContactsTable
              contacts={contacts}
              sort={params.sort}
              direction={params.direction}
              onSort={(column) =>
                setParams((current) => ({
                  ...current,
                  sort: column,
                  direction:
                    current.sort === column && current.direction === 'asc'
                      ? 'desc'
                      : 'asc',
                }))
              }
              onEdit={(contact) => setDialog({ kind: 'edit', contact })}
              onDelete={(contact) => setDialog({ kind: 'delete', contact })}
            />
          )}
        </div>
      </main>

      {/* Each dialog mounts its contents only while open, so the create and
          edit forms never put duplicate input ids in the document at once. */}
      <Dialog
        open={dialog.kind === 'create'}
        onOpenChange={(open) => !open && setDialog({ kind: 'closed' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add contact</DialogTitle>
            <DialogDescription>
              Someone you want to stay connected with.
            </DialogDescription>
          </DialogHeader>
          {dialog.kind === 'create' && (
            <ContactForm
              submitLabel="Add contact"
              onSubmit={handleCreate}
              onCancel={() => setDialog({ kind: 'closed' })}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog.kind === 'edit'}
        onOpenChange={(open) => !open && setDialog({ kind: 'closed' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit contact</DialogTitle>
            <DialogDescription>Update this contact's details.</DialogDescription>
          </DialogHeader>
          {dialog.kind === 'edit' && (
            <ContactForm
              initial={dialog.contact}
              submitLabel="Save changes"
              onSubmit={(input) => handleUpdate(dialog.contact.id, input)}
              onCancel={() => setDialog({ kind: 'closed' })}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog.kind === 'delete'}
        onOpenChange={(open) => !open && setDialog({ kind: 'closed' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete contact</DialogTitle>
            <DialogDescription>
              {dialog.kind === 'delete'
                ? `Delete ${dialog.contact.name}? This cannot be undone.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog({ kind: 'closed' })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={deleting}
              onClick={() =>
                dialog.kind === 'delete' && void handleDelete(dialog.contact)
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast message={toast} />}
    </div>
  );
}
