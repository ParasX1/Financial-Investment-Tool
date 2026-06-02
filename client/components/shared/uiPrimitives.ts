export {
  FIT_APP_SIDEBAR_WIDTH_FALLBACK,
  FIT_CONTENT_MAX_WIDTH_PX,
} from "./layoutMetrics";

export function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export const FIT_FOCUS_VISIBLE =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fit-color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--fit-color-page-bg)]";

export const fitLayout = {
  appMain:
    "ml-[var(--app-sidebar-width)] min-h-screen overflow-x-hidden bg-[color:var(--fit-color-page-bg)] text-white transition-[margin-left] duration-200 ease-out",
  appMainPadding:
    "px-3 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-10 lg:px-10",
} as const;

export const fitSurface = {
  page: "bg-[color:var(--fit-color-page-bg)] text-white",
  panel:
    "rounded-xl border border-[color:var(--fit-color-border-subtle)] bg-[color:var(--fit-color-surface)]",
  card: "rounded-xl border border-[color:var(--fit-color-border-subtle)] bg-[color:var(--fit-color-surface)]",
  panelBare: "rounded-xl bg-[color:var(--fit-color-surface)]",
  softPanel: "rounded-lg bg-[color:var(--fit-color-surface-soft)]",
} as const;

export const fitText = {
  body: "text-[color:var(--fit-color-text-body)]",
  subtle: "text-[color:var(--fit-color-text-muted)]",
  strong: "text-[color:var(--fit-color-text-strong)]",
  label: "text-[color:var(--fit-color-text-label)]",
  nav: "text-[color:var(--fit-color-text-nav)]",
  info: "text-[color:var(--fit-color-text-info)]",
  danger: "text-[color:var(--fit-color-text-danger)]",
  placeholder: "text-[color:var(--fit-color-text-placeholder)]",
  accent: "text-[color:var(--fit-color-accent)]",
  inverse: "text-white",
} as const;

export const fitField = {
  base:
    "bg-[color:var(--fit-color-field)] text-[color:var(--fit-color-text-strong)] placeholder:text-[color:var(--fit-color-text-placeholder)] focus:border-[color:var(--fit-color-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--fit-color-focus-soft)]",
  control:
    "rounded-lg bg-[color:var(--fit-color-field)] text-[color:var(--fit-color-text-strong)] placeholder:text-[color:var(--fit-color-text-placeholder)] focus:border-[color:var(--fit-color-focus)] focus:outline-none focus:ring-2 focus:ring-[color:var(--fit-color-focus-soft)]",
} as const;

export const fitIconButton = {
  base: "grid touch-manipulation place-items-center rounded-md transition-colors",
  subtle:
    "text-[color:var(--fit-color-text-muted)] hover:bg-white/[0.04] hover:text-[#f3f6ff]",
} as const;
