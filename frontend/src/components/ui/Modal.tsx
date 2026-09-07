import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A dialog built on the native <dialog> element, so focus trapping, Escape to
 * close, and the backdrop come from the browser rather than hand-rolled JS.
 *
 * Children render only while the dialog is open. That matters for more than
 * tidiness: the create and edit dialogs contain the same form, so keeping both
 * mounted would put two elements with `id="name"`, `id="company"` and so on in
 * the document at once. Duplicate ids are invalid HTML, and they break
 * label-to-input association — a screen reader (or a test) following the label
 * lands on the hidden copy. Unmounting also gives the edit form fresh state
 * each time it opens, rather than the previous contact's values.
 */
export function Modal({ open, title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) closes it.
        if (event.target === ref.current) onClose();
      }}
      aria-label={title}
      className="m-auto w-[calc(100vw-2rem)] max-w-lg rounded-2xl bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1 text-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
        {open ? children : null}
      </div>
    </dialog>
  );
}
