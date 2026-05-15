import type { FeedbackTone } from "./types";

export function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export const FOCUS_VISIBLE =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b8cff]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

export const communityUi = {
  page:
    "ml-[50px] mr-3 box-border min-h-screen overflow-x-hidden bg-[#000000] px-3 py-7 text-white sm:mr-0 sm:px-8 sm:py-9 lg:px-10",
  pageInner: "mx-auto min-w-0 max-w-[960px]",
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
    return "border-[#ff5b7c]/35 bg-[#ff3d68]/10 text-[#ffd9e2]";
  }

  if (tone === "success") {
    return "border-[#38d996]/35 bg-[#1fbf7a]/10 text-[#d7ffec]";
  }

  return "border-[#5367ff]/35 bg-[#5367ff]/10 text-[#dbe4ff]";
}
