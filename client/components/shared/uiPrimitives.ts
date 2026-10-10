export function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export const FIT_FOCUS_VISIBLE =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b8cff]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

export const FIT_CONTENT_MAX_WIDTH_PX = 1680;

export const fitSurface = {
  page: "fit-page-background text-white",
  panel:
    "rounded-xl border border-[var(--fit-color-border-subtle)] bg-[var(--fit-color-surface)]",
  card: "rounded-xl border border-[var(--fit-color-border-subtle)] bg-[var(--fit-color-surface)]",
} as const;

export const fitText = {
  body: "text-[var(--fit-color-text-body)]",
  subtle: "text-[var(--fit-color-text-muted)]",
  strong: "text-[#e2e7f2]",
  label: "text-[var(--fit-color-text-label)]",
  nav: "text-[#dce4ff]",
  info: "text-[#dbe4ff]",
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
