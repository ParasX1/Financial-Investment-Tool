// File purpose: Renders selectable smart tag suggestions for the discussion composer.
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import communityStyles from "../styles/community.module.css";
import { FOCUS_VISIBLE, cn, fitType } from "../design";
import {
  MAX_DISCUSSION_TAGS,
  normalizeSelectedTags,
  type SmartTagSuggestion,
} from "../lib/smartTags";

const TAG_KIND_CLASS: Record<SmartTagSuggestion["kind"], string> = {
  type: "border-[var(--fit-color-accent)] bg-[var(--fit-color-surface)] text-[var(--fit-color-text-body)]",
  topic:
    "border-[var(--fit-color-border-control)] bg-[var(--fit-color-surface)] text-[var(--fit-color-text-muted)]",
  ticker:
    "border-[var(--fit-color-success)] bg-[var(--fit-color-surface)] text-[var(--fit-color-success)]",
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
        "rounded-lg bg-[var(--fit-color-surface)] px-[12px] py-[10px]",
        communityStyles.softBorder,
      )}
    >
      <div className="mb-[9px] flex flex-wrap items-center justify-between gap-[8px]">
        <div
          className={cn(
            "flex items-center gap-[6px] text-[var(--fit-color-text-muted)]",
            fitType.caption,
          )}
        >
          <AutoAwesomeRoundedIcon sx={{ fontSize: 15 }} aria-hidden="true" />
          <span>Suggested tags</span>
        </div>

        <div className="flex items-center gap-[8px]">
          <span
            aria-live="polite"
            className={cn(
              "rounded-md border px-[7px] py-[2px]",
              fitType.badge,
              selected.size
                ? "border-[var(--fit-color-border-control)] bg-[var(--fit-color-surface)] text-[var(--fit-color-text-body)]"
                : "border-[var(--fit-color-border-control)] bg-[var(--fit-color-surface)] text-[var(--fit-color-text-muted)]",
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
                "inline-flex h-6 touch-manipulation items-center gap-[4px] rounded-md border border-[var(--fit-color-border-control)] bg-[var(--fit-color-surface)] px-[7px] text-[var(--fit-color-text-muted)] transition-colors hover:border-[var(--fit-color-border-control)] hover:text-[var(--fit-color-text-strong)]",
                fitType.badge,
                FOCUS_VISIBLE,
              )}
            >
              <CloseRoundedIcon sx={{ fontSize: 13 }} aria-hidden="true" />
              Clear all
            </button>
          ) : null}
        </div>
      </div>

      <ul
        className="flex flex-wrap gap-[7px]"
        aria-label="Discussion tag suggestions"
      >
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
                  "inline-flex min-h-7 max-w-full touch-manipulation items-center gap-[5px] rounded-md border px-[8px] py-[3px] transition-colors active:scale-[0.98]",
                  fitType.badge,
                  isSelected
                    ? cn(
                        TAG_KIND_CLASS[item.kind],
                        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                      )
                    : "border-[var(--fit-color-border-control)] bg-[var(--fit-color-surface)] text-[var(--fit-color-text-muted)] hover:border-[var(--fit-color-border-control)] hover:bg-[var(--fit-color-surface)] hover:text-[var(--fit-color-text-body)]",
                  "disabled:cursor-not-allowed disabled:opacity-45",
                  FOCUS_VISIBLE,
                  communityStyles.wrapAnywhere,
                )}
              >
                <span
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded-full",
                    isSelected
                      ? "bg-[var(--fit-color-surface-soft)] text-current"
                      : "bg-[var(--fit-color-surface-soft)] text-[var(--fit-color-text-muted)]",
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
