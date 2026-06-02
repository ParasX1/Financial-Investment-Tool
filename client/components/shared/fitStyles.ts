export const fitNav = {
  itemBase:
    "group flex min-h-[44px] min-w-0 touch-manipulation items-center gap-3 rounded-lg px-3 py-2 text-left transition-[background-color,color,box-shadow] duration-150",
  itemActive:
    "bg-[image:var(--fit-gradient-nav-active)] text-white shadow-[var(--fit-shadow-nav-active)]",
  itemActiveQuiet:
    "bg-[color:var(--fit-nav-active-bg)] text-white shadow-[inset_0_0_0_1px_var(--fit-nav-active-border)]",
  itemActiveCompact:
    "bg-[#101225] text-white shadow-[var(--fit-shadow-nav-compact-active)]",
  itemActiveCompactQuiet:
    "bg-[color:var(--fit-nav-active-bg)] text-[color:var(--fit-color-accent-strong)] shadow-[inset_0_0_0_1px_var(--fit-nav-active-border)]",
  itemIdle:
    "text-[color:var(--fit-color-text-nav-muted)] hover:bg-[image:var(--fit-nav-hover-bg)] hover:text-[#f4f7ff]",
  iconActive:
    "bg-white/[0.12] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
  iconActiveQuiet:
    "bg-[color:var(--fit-color-icon-surface)] text-[color:var(--fit-color-accent-strong)]",
  iconActiveStandalone:
    "bg-[image:var(--fit-gradient-icon-active)] text-white shadow-[var(--fit-shadow-icon-active)]",
  iconIdle:
    "bg-[color:var(--fit-color-icon-surface)] text-[color:var(--fit-color-text-muted)] group-hover:text-[color:var(--fit-color-text-nav)]",
  sectionLabel:
    "text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--fit-color-text-label)]",
  countPill:
    "rounded-md bg-black/30 px-2 py-[2px] text-xs font-bold tabular-nums text-[#c6cee0]",
} as const;

export const fitButton = {
  primary:
    "bg-[color:var(--fit-color-primary)] text-white transition-colors hover:bg-[color:var(--fit-color-primary-hover)]",
  secondary:
    "bg-[#15151a] text-[color:var(--fit-color-text-nav)] transition-colors hover:bg-[#20212a]",
  subtle:
    "text-[color:var(--fit-color-text-muted)] transition-colors hover:bg-white/[0.04] hover:text-[#f3f6ff]",
} as const;

export const fitFeedback = {
  info:
    "border-[color:var(--fit-feedback-info-border)] bg-[color:var(--fit-feedback-info-bg)] text-[color:var(--fit-color-text-info)]",
  error:
    "border-[color:var(--fit-feedback-error-border)] bg-[color:var(--fit-feedback-error-bg)] text-[color:var(--fit-color-text-danger)]",
  success:
    "border-[color:var(--fit-feedback-success-border)] bg-[color:var(--fit-feedback-success-bg)] text-[#d7ffec]",
} as const;
