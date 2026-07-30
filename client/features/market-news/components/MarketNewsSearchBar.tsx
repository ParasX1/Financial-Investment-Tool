import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { fitButton } from "@/components/shared/fitStyles";
import {
  FIT_FOCUS_VISIBLE,
  cn,
  fitType,
} from "@/components/shared/uiPrimitives";

export function MarketNewsSearchBar({
  draft,
  searchQuery,
  onClear,
  onDraftChange,
  onRefresh,
  onSubmit,
}: {
  draft: string;
  searchQuery: string;
  onClear: () => void;
  onDraftChange: (value: string) => void;
  onRefresh: () => void;
  onSubmit: () => void;
}) {
  return (
    <form
      role="search"
      className="flex min-w-0 items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="relative min-w-0 flex-1">
        <label htmlFor="market-news-search" className="sr-only">
          Search market news
        </label>
        <SearchRoundedIcon
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8f98aa]"
          sx={{ fontSize: 21 }}
          aria-hidden="true"
        />
        <input
          id="market-news-search"
          name="market-news-search"
          type="search"
          autoComplete="off"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Search news"
          className={cn(
            "fit-search-field h-12 w-full rounded-lg pl-12 pr-12",
            fitType.field,
          )}
        />
        {draft || searchQuery ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear market news search"
            className={cn(
              "absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[#a5adbf] transition-colors hover:bg-white/[0.06] hover:text-white",
              FIT_FOCUS_VISIBLE,
            )}
          >
            <CloseRoundedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <button
        type="submit"
        className={cn(
          "inline-flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-lg sm:w-auto sm:px-4",
          fitType.control,
          fitButton.primary,
          FIT_FOCUS_VISIBLE,
        )}
        aria-label="Search market news"
      >
        <SearchRoundedIcon sx={{ fontSize: 20 }} aria-hidden="true" />
        <span className="hidden sm:inline">Search</span>
      </button>

      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh market news"
        className={cn(
          "grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-[var(--fit-color-border-subtle)] text-[#dce4ff]",
          fitButton.secondary,
          FIT_FOCUS_VISIBLE,
        )}
      >
        <RefreshRoundedIcon sx={{ fontSize: 21 }} aria-hidden="true" />
      </button>
    </form>
  );
}
