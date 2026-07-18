// File purpose: Collects a private, structured moderation report for one discussion.
import * as React from "react";
import communityStyles from "../styles/community.module.css";
import { FOCUS_VISIBLE, cn, communityUi, fitType } from "../design";
import type { CommunityReportReason } from "../types";

const REPORT_REASONS: Array<{
  value: CommunityReportReason;
  label: string;
}> = [
  { value: "spam_or_scam", label: "Spam or scam" },
  {
    value: "misleading_financial_claim",
    label: "Misleading financial claim",
  },
  { value: "market_manipulation", label: "Possible market manipulation" },
  { value: "harassment", label: "Harassment" },
  { value: "other", label: "Other" },
];

export function ReportPostDialog({
  postId,
  busy,
  onCancel,
  onSubmit,
}: {
  postId: string | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (reason: CommunityReportReason, details: string) => void;
}) {
  const [reason, setReason] = React.useState<CommunityReportReason | "">("");
  const [details, setDetails] = React.useState("");
  const titleId = React.useId();
  const descriptionId = React.useId();
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const reasonRef = React.useRef<HTMLSelectElement | null>(null);

  React.useEffect(() => {
    if (!postId) return;

    setReason("");
    setDetails("");
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    reasonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [postId]);

  if (!postId) return null;

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !busy) {
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason || busy) return;
    onSubmit(reason, details);
  }

  return (
    <div
      className="fixed inset-0 z-[1200] grid place-items-center bg-black/70 px-4"
      role="presentation"
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        className={cn(
          "w-full max-w-[480px] rounded-xl bg-[#09090b] p-5 text-white shadow-2xl",
          communityStyles.panelBorder,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 id={titleId} className={fitType.panelTitle}>
          Report this discussion
        </h2>
        <p
          id={descriptionId}
          className={cn("mt-2 text-[#aeb7c8]", fitType.bodySm)}
        >
          Only moderators can review the report. It will not appear publicly on
          the discussion.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className={cn("block text-[#cbd3e2]", fitType.bodySm)}>
            Report reason
            <select
              ref={reasonRef}
              required
              value={reason}
              disabled={busy}
              onChange={(event) =>
                setReason(event.target.value as CommunityReportReason | "")
              }
              className={cn(
                "mt-1 h-11 w-full px-3",
                communityUi.field,
                communityStyles.inputBorder,
                FOCUS_VISIBLE,
              )}
            >
              <option value="">Choose a reason</option>
              {REPORT_REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className={cn("block text-[#cbd3e2]", fitType.bodySm)}>
            Additional details (optional)
            <textarea
              value={details}
              disabled={busy}
              maxLength={500}
              rows={4}
              onChange={(event) => setDetails(event.target.value)}
              className={cn(
                "mt-1 w-full resize-y px-3 py-2",
                communityUi.field,
                communityStyles.inputBorder,
                FOCUS_VISIBLE,
              )}
              placeholder="Briefly explain what moderators should review."
            />
            <span className="mt-1 block text-right text-[#7f899c]">
              {details.length}/500
            </span>
          </label>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className={cn(
                "rounded-lg px-4 py-2 text-[#c4ccdc] transition-colors hover:bg-white/[0.04] hover:text-white disabled:opacity-50",
                fitType.control,
                FOCUS_VISIBLE,
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason || busy}
              className={cn(
                "rounded-lg bg-[#5268ff] px-4 py-2 text-white transition-colors hover:bg-[#6679ff] disabled:cursor-not-allowed disabled:opacity-50",
                fitType.control,
                FOCUS_VISIBLE,
              )}
            >
              {busy ? "Sending…" : "Send report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
