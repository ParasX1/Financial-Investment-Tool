import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import communityStyles from "@/styles/community.module.css";
import { FOCUS_VISIBLE, cn } from "../design";
import {
  MAX_DISCUSSION_TAGS,
  normalizeSelectedTags,
  type SmartTagSuggestion,
} from "../smartTags";

const TAG_KIND_CLASS: Record<SmartTagSuggestion["kind"], string> = {
  type: "border-[#5367ff]/60 bg-[#141a3f] text-[#d5ddff]",
  topic: "border-[#2d3342] bg-[#111318] text-[#aeb7c8]",
  ticker: "border-[#2c5d4a]/70 bg-[#0c1c17] font-mono text-[#9ff0c8]",
};

export function SmartTagSuggestions({
  items,
  onClear,
  onToggle,
  selectedTags,
}: {
  items: SmartTagSuggestion[];
  onClear: () => void;
  onToggle: (tag: string) => void;
  selectedTags: string[];
}) {
  if (!items.length) return null;
  const selected = new Set(normalizeSelectedTags(selectedTags));
  const selectedCountLabel = selected.size
    ? `${selected.size}/${MAX_DISCUSSION_TAGS} selected`
    : "No tags selected";

  return (
    <div
      className={cn(
        "rounded-lg bg-[#101014] px-[12px] py-[10px]",
        communityStyles.softBorder
      )}
    >
      <div className="mb-[9px] flex flex-wrap items-center justify-between gap-[8px]">
        <div className="flex items-center gap-[6px] text-xs font-semibold text-[#9aa3b5]">
          <AutoAwesomeRoundedIcon sx={{ fontSize: 15 }} aria-hidden="true" />
          <span>Suggested tags</span>
        </div>

        <div className="flex items-center gap-[8px]">
          <span
            aria-live="polite"
            className={cn(
              "rounded-md border px-[7px] py-[2px] text-[11px] font-semibold leading-4",
              selected.size
                ? "border-[#394050] bg-[#171923] text-[#c4ccdc]"
                : "border-[#2b2f3a] bg-[#0b0b0e] text-[#858d9d]"
            )}
          >
            {selectedCountLabel}
          </span>

          {selected.size ? (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear all selected discussion tags"
              className={cn(
                "inline-flex h-6 touch-manipulation items-center gap-[4px] rounded-md border border-[#303340] bg-[#0c0c10] px-[7px] text-[11px] font-semibold text-[#9aa3b5] transition-colors hover:border-[#464c5f] hover:text-[#e2e7f2]",
                FOCUS_VISIBLE
              )}
            >
              <CloseRoundedIcon sx={{ fontSize: 13 }} aria-hidden="true" />
              Clear all
            </button>
          ) : null}
        </div>
      </div>

      <ul className="flex flex-wrap gap-[7px]" aria-label="Discussion tag suggestions">
        {items.map((item) => {
          const isSelected = selected.has(item.label);
          const isAtLimit = !isSelected && selected.size >= MAX_DISCUSSION_TAGS;
          const isDisabled = isAtLimit;
          const action = isSelected ? "Remove" : "Select";

          return (
            <li key={`${item.kind}-${item.label}`}>
              <button
                type="button"
                onClick={() => onToggle(item.label)}
                disabled={isDisabled}
                aria-pressed={isSelected}
                aria-label={
                  isAtLimit
                    ? `Maximum ${MAX_DISCUSSION_TAGS} tags selected. ${item.label} is not selected.`
                    : `${action} ${item.label} tag. ${item.reason}.`
                }
                className={cn(
                  "inline-flex min-h-7 max-w-full touch-manipulation items-center gap-[5px] rounded-md border px-[8px] py-[3px] text-xs font-medium leading-5 transition-colors active:scale-[0.98]",
                  isSelected
                    ? cn(TAG_KIND_CLASS[item.kind], "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]")
                    : "border-[#303340] bg-[#0c0c10] text-[#858d9d] hover:border-[#464c5f] hover:bg-[#111218] hover:text-[#c4ccdc]",
                  "disabled:cursor-not-allowed disabled:opacity-45",
                  FOCUS_VISIBLE,
                  communityStyles.wrapAnywhere
                )}
              >
                <span
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded-full",
                    isSelected
                      ? "bg-white/[0.10] text-current"
                      : "bg-white/[0.04] text-[#70798b]"
                  )}
                  aria-hidden="true"
                >
                  {isSelected ? (
                    <CheckRoundedIcon sx={{ fontSize: 13 }} />
                  ) : (
                    <AddRoundedIcon sx={{ fontSize: 13 }} />
                  )}
                </span>
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
