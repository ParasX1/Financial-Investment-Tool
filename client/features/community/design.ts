// File purpose: Maps shared FIT design primitives into Community-specific class helpers.
import type { FeedbackTone } from "./types";
import { fitFeedback } from "@/components/shared/fitStyles";
import {
  FIT_FOCUS_VISIBLE,
  cn,
  fitText,
  fitType,
} from "@/components/shared/uiPrimitives";

export { cn, fitText, fitType };

export const FOCUS_VISIBLE = FIT_FOCUS_VISIBLE;

export const communityUi = {
  panel: "rounded-[var(--fit-radius-panel)] bg-[var(--fit-color-surface)]",
  card: "rounded-[var(--fit-radius-panel)] bg-[var(--fit-color-surface)]",
  softPanel: "rounded-lg bg-[var(--fit-color-surface-soft)]",
  field: `rounded-[var(--fit-radius-control)] bg-[var(--fit-color-field)] text-[var(--fit-color-text-strong)] placeholder:text-[var(--fit-color-text-muted)] focus:border-[var(--fit-color-focus-ring)] ${FOCUS_VISIBLE} ${fitType.field}`,
  disabled: "disabled:cursor-not-allowed disabled:opacity-50",
  iconButton:
    "grid touch-manipulation place-items-center rounded-md transition-colors",
  avatar: `grid shrink-0 place-items-center rounded-full text-[var(--fit-color-text-strong)] ${fitType.avatar}`,
  inlineAction: `inline-flex touch-manipulation items-center rounded-md transition-colors ${fitType.control}`,
  helperText: `${fitType.caption} text-[var(--fit-color-text-muted)]`,
};

export function feedbackToneClasses(tone: FeedbackTone) {
  if (tone === "error") {
    return fitFeedback.error;
  }

  if (tone === "success") {
    return fitFeedback.success;
  }

  return fitFeedback.info;
}
