// File purpose: Maps shared FIT design primitives into Community-specific class helpers.
import type { FeedbackTone } from "./types";
import { fitButton, fitFeedback, fitNav } from "@/components/shared/fitStyles";
import {
  FIT_FOCUS_VISIBLE,
  cn,
  fitField,
  fitIconButton,
  fitLayout,
  fitSurface,
  fitText,
} from "@/components/shared/uiPrimitives";

export { cn };

export const FOCUS_VISIBLE = FIT_FOCUS_VISIBLE;

export const communityUi = {
  page: cn(
    fitLayout.appMain,
    "mr-3 box-border px-3 pb-7 pt-[86px] sm:mr-0 sm:px-8 sm:pb-9 sm:pt-[94px] lg:px-10",
  ),
  pageInner: "mx-auto min-w-0",
  panel: fitSurface.panelBare,
  card: fitSurface.panelBare,
  softPanel: fitSurface.softPanel,
  fieldBase: fitField.base,
  field: fitField.control,
  disabled: "disabled:cursor-not-allowed disabled:opacity-50",
  iconButton: fitIconButton.base,
};

export const communityButton = {
  primary: fitButton.primary,
  secondary: fitButton.secondary,
};

export const communityText = {
  placeholder: fitText.placeholder,
};

export const communityNav = fitNav;

export function feedbackToneClasses(tone: FeedbackTone) {
  if (tone === "error") {
    return fitFeedback.error;
  }

  if (tone === "success") {
    return fitFeedback.success;
  }

  return fitFeedback.info;
}
