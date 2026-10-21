export function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export const FIT_FOCUS_VISIBLE =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fit-color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fit-color-page-bg)]";

export const fitSurface = {
  page: "fit-page-background text-[var(--fit-color-text-strong)]",
  panel:
    "rounded-[var(--fit-radius-panel)] border border-[var(--fit-color-border-subtle)] bg-[var(--fit-color-surface)]",
  card: "rounded-[var(--fit-radius-panel)] border border-[var(--fit-color-border-subtle)] bg-[var(--fit-color-surface)]",
} as const;

export const fitText = {
  body: "text-[var(--fit-color-text-body)]",
  subtle: "text-[var(--fit-color-text-muted)]",
  strong: "text-[var(--fit-color-text-strong)]",
  label: "text-[var(--fit-color-text-label)]",
  nav: "text-[var(--fit-color-text-body)]",
  info: "text-[var(--fit-color-info)]",
  accent: "text-[var(--fit-color-accent)]",
} as const;

export const fitType = {
  displayTitle: "fit-type-display-title",
  pageTitle: "fit-type-page-title",
  sectionTitle: "fit-type-section-title",
  featureTitle: "fit-type-feature-title",
  panelTitle: "fit-type-panel-title",
  body: "fit-type-body",
  bodySm: "fit-type-body-sm",
  caption: "fit-type-caption",
  eyebrow: "fit-type-eyebrow",
  badge: "fit-type-badge",
  control: "fit-type-control",
  navLabel: "fit-type-nav-label",
  field: "fit-type-field",
  metric: "fit-type-metric",
  metricMd: "fit-type-metric-md",
  metricLg: "fit-type-metric-lg",
  avatar: "fit-type-avatar",
  avatarSm: "fit-type-avatar-sm",
  avatarMd: "fit-type-avatar-md",
} as const;
