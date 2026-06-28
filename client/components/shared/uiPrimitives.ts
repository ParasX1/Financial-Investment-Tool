export function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export const FIT_FOCUS_VISIBLE =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b8cff]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

export const FIT_CONTENT_MAX_WIDTH_PX = 1680;

export const fitSurface = {
  page: "bg-[var(--fit-color-page-bg)] text-white",
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
