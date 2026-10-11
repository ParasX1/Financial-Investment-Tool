// File purpose: Renders the confirmation dialog used before deleting posts or comments.
import * as React from "react";
import communityStyles from "../styles/community.module.css";
import { FOCUS_VISIBLE, cn, fitType } from "../design";
import type { PendingDelete } from "../types";

export function DeleteConfirmDialog({
  pending,
  busy,
  onCancel,
  onConfirm,
}: {
  pending: PendingDelete | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!pending) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [pending]);

  if (!pending) return null;

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !busy) {
      onCancel();
      return;
    }

    if (event.key !== "Tab") return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (!focusable.length) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1200] grid place-items-center overflow-y-auto bg-black/70 px-4 py-4"
      role="presentation"
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        className={cn(
          "w-full max-w-[420px] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[var(--fit-radius-panel)] bg-[var(--fit-color-surface)] p-5 text-[var(--fit-color-text-strong)] shadow-2xl",
          communityStyles.panelBorder,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 id={titleId} className={fitType.panelTitle}>
          {pending.title}
        </h2>
        <p
          id={descriptionId}
          className={cn(
            "mt-2 text-[var(--fit-color-text-body)]",
            fitType.bodySm,
          )}
        >
          {pending.message}
        </p>

        <div className="mt-5 flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={cn(
              "rounded-lg px-4 py-2 text-[var(--fit-color-text-body)] transition-colors hover:bg-[var(--fit-color-surface-soft)] hover:text-[var(--fit-color-text-strong)] disabled:cursor-not-allowed disabled:opacity-50",
              fitType.control,
              FOCUS_VISIBLE,
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "rounded-lg bg-[var(--fit-color-danger)] px-4 py-2 text-[var(--fit-color-action-ink)] transition-colors hover:bg-[var(--fit-color-danger)] disabled:cursor-not-allowed disabled:opacity-50",
              fitType.control,
              FOCUS_VISIBLE,
            )}
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
