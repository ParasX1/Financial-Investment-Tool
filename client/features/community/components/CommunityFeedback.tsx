// File purpose: Renders inline notices, status messages, and dismissible Community feedback.
import * as React from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import communityStyles from "../styles/community.module.css";
import { FOCUS_VISIBLE, cn, feedbackToneClasses } from "../design";
import type { FeedbackMessage, FeedbackTone } from "../types";

export function CommunityNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-[#5367ff]/10 px-4 py-3 text-sm text-[#dbe4ff]",
        communityStyles.noticeBorder
      )}
    >
      {children}
    </div>
  );
}

export function StatusMessage({
  tone,
  title,
  children,
}: {
  tone: FeedbackTone;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        feedbackToneClasses(tone)
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-1 text-sm opacity-90">{children}</div> : null}
    </div>
  );
}

export function FeedbackStack({
  items,
  onDismiss,
}: {
  items: FeedbackMessage[];
  onDismiss: (id: string) => void;
}) {
  if (!items.length) return null;

  return (
    <div className="mt-4 space-y-3" aria-live="polite" aria-relevant="additions">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm",
            feedbackToneClasses(item.tone)
          )}
          role={item.tone === "error" ? "alert" : "status"}
        >
          <div className="min-w-0">
            <p className="font-semibold">{item.title}</p>
            {item.message ? (
              <p className={cn("mt-1 opacity-90", communityStyles.wrapAnywhere)}>
                {item.message}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-md opacity-80 transition-colors hover:bg-white/10 hover:opacity-100",
              FOCUS_VISIBLE
            )}
            aria-label={`Dismiss ${item.title}`}
          >
            <CloseRoundedIcon sx={{ fontSize: 17 }} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
