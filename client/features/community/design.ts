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
  page: "ml-[var(--community-app-rail-width)] mr-3 box-border min-h-screen overflow-x-hidden bg-black px-3 pb-7 pt-[86px] text-white sm:mr-0 sm:px-5 sm:pb-9 sm:pt-[94px] lg:px-6 xl:px-7",
  pageInner: "mx-auto min-w-0",
  panel: "rounded-xl bg-[var(--fit-color-surface)]",
  card: "rounded-xl bg-[var(--fit-color-surface)]",
  softPanel: "rounded-lg bg-[var(--fit-color-surface-soft)]",
  field: `rounded-lg bg-[var(--fit-color-field)] text-[#e2e7f2] placeholder:text-[#7f8798] focus:border-[#6f7cff]/75 focus:outline-none focus:ring-2 focus:ring-[#6f7cff]/20 ${fitType.field}`,
  disabled: "disabled:cursor-not-allowed disabled:opacity-50",
  iconButton:
    "grid touch-manipulation place-items-center rounded-md transition-colors",
  avatar: `grid shrink-0 place-items-center rounded-full text-white ${fitType.avatar}`,
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
