import type { KeyboardEvent } from "react";

type DialogTabEvent = Pick<
  KeyboardEvent<HTMLElement>,
  | "key"
  | "defaultPrevented"
  | "shiftKey"
  | "target"
  | "currentTarget"
  | "preventDefault"
>;

// Only wrap the visible Tab edges. The installed Modal retains ownership of
// initial focus, enforcement, restoration, Escape and background accessibility.
export function wrapDialogTabBoundary(
  event: DialogTabEvent,
  { focusFromContainer = false }: { focusFromContainer?: boolean } = {},
) {
  if (event.key !== "Tab" || event.defaultPrevented) return;

  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      "button, input, select, textarea, a[href], summary, [tabindex]",
    ),
  ).filter((control) => {
    if (
      control.tabIndex < 0 ||
      control.matches(":disabled") ||
      control.getClientRects().length === 0
    ) {
      return false;
    }
    // Chromium may expose layout boxes for closed-details descendants, but
    // only the direct summary can receive native keyboard focus.
    for (
      let details = control.closest<HTMLDetailsElement>("details:not([open])");
      details;
      details =
        details.parentElement?.closest<HTMLDetailsElement>(
          "details:not([open])",
        ) ?? null
    ) {
      if (!details.querySelector(":scope > summary")?.contains(control))
        return false;
    }
    return true;
  });

  const first = controls[0];
  const last = controls[controls.length - 1];
  const active = event.currentTarget.ownerDocument.activeElement;
  // MUI may move root focus to a sentinel during document capture. Keep the
  // original container target for that case, before React's bubbling handler.
  const fromContainer =
    focusFromContainer && event.target === event.currentTarget;
  const destination = event.shiftKey ? last : first;
  const atBoundary = event.shiftKey ? active === first : active === last;

  if (fromContainer || (destination && atBoundary)) {
    event.preventDefault();
    destination?.focus();
  }
}
