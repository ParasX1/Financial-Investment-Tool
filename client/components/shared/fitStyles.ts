export const fitNav = {
  itemBase:
    "group flex min-h-[44px] min-w-0 touch-manipulation items-center gap-3 rounded-lg px-3 py-2 text-left transition-[background-color,color,box-shadow] duration-150",
  itemActive:
    "bg-gradient-to-r from-[#1f2466] via-[#24175a] to-[#3a155f] text-white shadow-[inset_0_0_0_1px_rgba(123,140,255,0.42),0_12px_28px_rgba(83,103,255,0.18)]",
  itemActiveQuiet:
    "bg-[var(--fit-nav-active-bg)] text-white shadow-[inset_0_0_0_1px_var(--fit-nav-active-border)]",
  itemActiveCompact:
    "bg-[#101225] text-white shadow-[inset_0_0_0_1px_rgba(123,140,255,0.28),0_0_24px_rgba(83,103,255,0.12)]",
  itemActiveCompactQuiet:
    "bg-[var(--fit-nav-active-bg)] text-[var(--fit-color-accent-strong)] shadow-[inset_0_0_0_1px_var(--fit-nav-active-border)]",
  itemIdle:
    "text-[#a5adbf] hover:bg-[linear-gradient(135deg,rgba(83,103,255,0.10),rgba(124,58,237,0.12))] hover:text-[#f4f7ff]",
  iconActive:
    "bg-white/[0.12] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
  iconActiveQuiet: "bg-[#141419] text-[var(--fit-color-accent-strong)]",
  iconActiveStandalone:
    "bg-gradient-to-br from-[#5367ff] via-[#6d4cff] to-[#2b164f] text-white shadow-[0_0_22px_rgba(83,103,255,0.42),inset_0_0_0_1px_rgba(213,220,255,0.24)]",
  iconIdle: "bg-[#141419] text-[#8f98aa] group-hover:text-[#dce4ff]",
  sectionLabel:
    "text-[11px] font-bold uppercase tracking-[0.14em] text-[#687184]",
  countPill:
    "rounded-md bg-black/30 px-2 py-[2px] text-xs font-bold tabular-nums text-[#c6cee0]",
} as const;

export const fitButton = {
  primary: "bg-[#5d67ff] text-white transition-colors hover:bg-[#7079ff]",
  secondary: "bg-[#15151a] text-[#dce4ff] transition-colors hover:bg-[#20212a]",
  subtle:
    "text-[#8f98aa] transition-colors hover:bg-white/[0.04] hover:text-[#f3f6ff]",
} as const;

export const fitFeedback = {
  info: "border-[#5367ff]/35 bg-[#5367ff]/10 text-[#dbe4ff]",
  error: "border-[#ff5b7c]/35 bg-[#ff3d68]/10 text-[#ffd9e2]",
  success: "border-[#38d996]/35 bg-[#1fbf7a]/10 text-[#d7ffec]",
} as const;
