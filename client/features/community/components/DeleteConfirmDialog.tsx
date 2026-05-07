import * as React from "react";
import communityStyles from "@/styles/community.module.css";
import { FOCUS_VISIBLE, cn } from "../design";
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
  const cancelButtonRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!pending) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    cancelButtonRef.current?.focus();

    return () => {
      previousFocus?.focus();
    };
  }, [pending]);

  if (!pending) return null;

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !busy) {
      onCancel();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1200] grid place-items-center bg-black/70 px-4"
      role="presentation"
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          "w-full max-w-[420px] rounded-xl bg-[#09090b] p-5 text-white shadow-2xl",
          communityStyles.panelBorder
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 id={titleId} className="text-lg font-bold">
          {pending.title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-[#c4ccdc]">
          {pending.message}
        </p>

        <div className="mt-5 flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold text-[#c4ccdc] transition-colors hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
              FOCUS_VISIBLE
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "rounded-lg bg-[#ff3d68] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#ff5b7c] disabled:cursor-not-allowed disabled:opacity-50",
              FOCUS_VISIBLE
            )}
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
