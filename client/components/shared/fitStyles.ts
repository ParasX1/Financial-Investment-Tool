import { fitType } from "./uiPrimitives";

export const fitNav = {
  itemBase:
    "group flex min-h-[44px] min-w-0 touch-manipulation items-center gap-3 rounded-lg px-3 py-2 text-left transition-[background-color,color,box-shadow] duration-150",
  itemActive:
    "bg-[var(--fit-nav-active-bg)] text-[var(--fit-color-text-strong)] shadow-[inset_3px_0_0_var(--fit-color-accent)]",
  itemActiveQuiet:
    "bg-[var(--fit-nav-active-bg)] text-[var(--fit-color-text-strong)] shadow-[inset_3px_0_0_var(--fit-nav-active-border)]",
  itemActiveCompact:
    "bg-[var(--fit-nav-active-bg)] text-[var(--fit-color-accent)] shadow-[inset_3px_0_0_var(--fit-nav-active-border)]",
  itemActiveCompactQuiet:
    "bg-[var(--fit-nav-active-bg)] text-[var(--fit-color-accent-strong)] shadow-[inset_0_0_0_1px_var(--fit-nav-active-border)]",
  itemIdle:
    "text-[var(--fit-color-text-muted)] hover:bg-[var(--fit-color-surface-soft)] hover:text-[var(--fit-color-text-strong)]",
  iconActive:
    "bg-[var(--fit-color-accent-soft)] text-[var(--fit-color-accent)]",
  iconActiveQuiet:
    "bg-[var(--fit-color-surface-soft)] text-[var(--fit-color-accent-strong)]",
  iconActiveStandalone:
    "bg-[var(--fit-color-accent)] text-[var(--fit-color-action-ink)]",
  iconIdle:
    "bg-[var(--fit-color-surface)] text-[var(--fit-color-text-muted)] group-hover:text-[var(--fit-color-text-strong)]",
  sectionLabel: `${fitType.eyebrow} uppercase text-[var(--fit-color-text-label)]`,
  countPill: `rounded-md bg-[var(--fit-color-inner-surface)] px-2 py-[2px] tabular-nums text-[var(--fit-color-text-body)] ${fitType.badge}`,
} as const;

export const fitButton = {
  primary:
    "bg-[var(--fit-color-accent)] text-[var(--fit-color-action-ink)] transition-colors hover:bg-[var(--fit-color-action-hover)]",
  secondary:
    "bg-[var(--fit-color-field)] text-[var(--fit-color-text-body)] transition-colors hover:bg-[var(--fit-color-surface-soft)]",
  subtle:
    "text-[var(--fit-color-text-muted)] transition-colors hover:bg-[var(--fit-color-surface-soft)] hover:text-[var(--fit-color-text-strong)]",
} as const;

export const fitFeedback = {
  info: "border-[var(--fit-color-info)] bg-[var(--fit-color-info-soft)] text-[var(--fit-color-info)]",
  error:
    "border-[var(--fit-color-danger)] bg-[var(--fit-color-danger-soft)] text-[var(--fit-color-danger)]",
  success:
    "border-[var(--fit-color-success)] bg-[var(--fit-color-success-soft)] text-[var(--fit-color-success)]",
} as const;
