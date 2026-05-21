import type { FeedbackTone } from "./types";
import { fitFeedback } from "@/components/shared/fitStyles";
import {
  FIT_FOCUS_VISIBLE,
  cn,
} from "@/components/shared/uiPrimitives";

export { cn };

export const FOCUS_VISIBLE = FIT_FOCUS_VISIBLE;

export const communityUi = {
  page:
    "ml-[var(--community-app-rail-width)] mr-3 box-border min-h-screen overflow-x-hidden bg-black px-3 pb-7 pt-[86px] text-white sm:mr-0 sm:px-8 sm:pb-9 sm:pt-[94px] lg:px-10",
  pageInner: "mx-auto min-w-0",
  panel: "rounded-xl bg-[#09090b]",
  card: "rounded-xl bg-[#09090b]",
  softPanel: "rounded-lg bg-[#111114]",
  field:
    "rounded-lg bg-[#18181b] text-[#e2e7f2] placeholder:text-[#7f8798] focus:border-[#6f7cff]/75 focus:outline-none focus:ring-2 focus:ring-[#6f7cff]/20",
  disabled: "disabled:cursor-not-allowed disabled:opacity-50",
  iconButton:
    "grid touch-manipulation place-items-center rounded-md transition-colors",
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
