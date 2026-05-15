import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import communityStyles from "@/styles/community.module.css";
import { COMMUNITY_SORT_OPTIONS } from "../constants";
import { FOCUS_VISIBLE, cn, communityUi } from "../design";
import type { SortMode } from "../types";

export function CommunityToolbar({
  query,
  sort,
  onQueryChange,
  onSortChange,
}: {
  query: string;
  sort: SortMode;
  onQueryChange: (value: string) => void;
  onSortChange: (value: SortMode) => void;
}) {
  return (
    <section className="mt-6 flex flex-col gap-[12px] sm:flex-row">
      <div className="relative min-w-0 flex-1">
        <label htmlFor="community-search" className="sr-only">
          Search discussions
        </label>
        <SearchRoundedIcon
          className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-[#7f8798]"
          sx={{ fontSize: 20 }}
          aria-hidden="true"
        />
        <input
          id="community-search"
          name="community-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search discussions…"
          className={cn(
            "h-[46px] w-full pl-[44px] pr-[16px] text-[15px]",
            communityUi.field,
            communityStyles.panelBorder
          )}
        />
      </div>

      <div
        className={cn(
          "grid h-[46px] w-full grid-cols-2 rounded-lg bg-[#09090b] p-[4px] sm:w-[134px]",
          communityStyles.panelBorder
        )}
        role="group"
        aria-label="Sort discussions"
      >
        {COMMUNITY_SORT_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSortChange(option)}
            aria-pressed={sort === option}
            className={cn(
              "touch-manipulation rounded-md text-sm font-bold capitalize transition-colors",
              sort === option
                ? "bg-[#5d67ff] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                : "text-[#8f98aa] hover:bg-white/[0.04] hover:text-[#f3f6ff]",
              FOCUS_VISIBLE
            )}
          >
            {option === "top" ? "Top" : "New"}
          </button>
        ))}
      </div>
    </section>
  );
}
