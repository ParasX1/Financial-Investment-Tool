import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";

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
      className="flex min-w-0 flex-1 items-center gap-2"
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
          placeholder="Search for news, tickers, or companies"
          className={cn(
            "h-12 w-full rounded-full border border-[#202230] bg-[#181c22] pl-12 pr-12 text-[15px] font-semibold text-white placeholder:text-[#8791a3]",
            "transition-colors hover:border-[#00b884]/45 focus:border-[#00b884]/70 focus:outline-none focus:ring-2 focus:ring-[#00b884]/15",
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
          "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00b884] text-sm font-extrabold text-[#03110d] transition-colors hover:bg-[#18d39d] sm:w-auto sm:px-5",
          FIT_FOCUS_VISIBLE,
        )}
        aria-label="Search market news"
      >
        <SearchRoundedIcon className="sm:hidden" sx={{ fontSize: 21 }} aria-hidden="true" />
        <span className="hidden sm:inline">Search</span>
      </button>

      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh market news"
        className={cn(
          "grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[#dce4ff] transition-colors hover:border-[#00b884]/45 hover:bg-white/[0.07]",
          FIT_FOCUS_VISIBLE,
        )}
      >
        <RefreshRoundedIcon sx={{ fontSize: 21 }} aria-hidden="true" />
      </button>
    </form>
  );
}
