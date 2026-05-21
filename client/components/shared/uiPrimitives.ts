export function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export const FIT_FOCUS_VISIBLE =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b8cff]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

export const FIT_CONTENT_MAX_WIDTH_PX = 1180;

export const fitSurface = {
  page: "bg-black text-white",
  panel: "rounded-xl border border-[rgba(132,146,176,0.12)] bg-[#09090b]",
  card: "rounded-xl border border-[rgba(132,146,176,0.12)] bg-[#09090b]",
} as const;

export const fitText = {
  body: "text-[#b9c1d0]",
  subtle: "text-[#8f98aa]",
  strong: "text-[#e2e7f2]",
  label: "text-[#687184]",
  nav: "text-[#dce4ff]",
  info: "text-[#dbe4ff]",
  accent: "text-[#8ea0ff]",
} as const;
