import * as React from "react";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import type {
  MarketNewsMarketScope,
  MarketNewsMarketScopeId,
  MarketNewsTicker,
} from "../types";
import { MarketNewsSparkline } from "./MarketNewsSparkline";

const toneClass = {
  negative: "text-[#ff4d5d]",
  neutral: "text-[#b9c1d0]",
  positive: "text-[#00b884]",
} as const;

export function MarketNewsTickerStrip({
  marketScope,
  marketScopes,
  selectedSymbol,
  tickers,
  onMarketScopeChange,
  onTickerSelect,
}: {
  marketScope: MarketNewsMarketScope;
  marketScopes: readonly MarketNewsMarketScope[];
  selectedSymbol: string;
  tickers: readonly MarketNewsTicker[];
  onMarketScopeChange: (scopeId: MarketNewsMarketScopeId) => void;
  onTickerSelect: (symbol: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const menuId = React.useId();
  const scopeRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!scopeRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <section aria-label="Market snapshot" className="min-w-0">
      <div className="flex min-w-0 gap-3 overflow-x-auto px-3 py-4 [scrollbar-width:none] sm:px-8 lg:px-10 [&::-webkit-scrollbar]:hidden">
        <div ref={scopeRef} className="relative z-20 shrink-0 pr-2">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((nextOpen) => !nextOpen)}
            className={cn(
              "flex h-[76px] min-w-[11.5rem] items-center gap-2 rounded-lg border border-white/10 bg-[#101318] px-3 text-left text-sm font-extrabold text-[#dce4ff] transition-colors hover:border-[#00b884]/45 hover:bg-[#151a20]",
              FIT_FOCUS_VISIBLE,
            )}
          >
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#00b884]/35 bg-[#00b884]/10 text-[#00d49a]"
              aria-hidden="true"
            >
              <PublicRoundedIcon sx={{ fontSize: 18 }} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs uppercase tracking-[0.12em] text-[#8f98aa]">
                {marketScope.shortLabel}
              </span>
              <span className="block truncate text-sm text-white">
                {marketScope.label}
              </span>
            </span>
            <KeyboardArrowDownRoundedIcon
              sx={{ fontSize: 20 }}
              className={cn(
                "shrink-0 text-[#a5adbf] transition-transform",
                open ? "rotate-180" : "",
              )}
              aria-hidden="true"
            />
          </button>

          {open ? (
            <div
              id={menuId}
              role="menu"
              aria-label="Choose market snapshot"
              className="absolute left-0 top-[calc(100%+0.4rem)] w-[13.5rem] overflow-hidden rounded-md border border-white/10 bg-[#12161b] py-1 shadow-2xl shadow-black/40"
            >
              {marketScopes.map((scope) => {
                const selected = scope.id === marketScope.id;

                return (
                  <button
                    key={scope.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => {
                      onMarketScopeChange(scope.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex min-h-[38px] w-full items-center justify-between gap-3 px-3 text-left text-sm font-extrabold transition-colors",
                      selected
                        ? "bg-[#35558f] text-white"
                        : "text-[#dce4ff] hover:bg-white/[0.06] hover:text-white",
                      FIT_FOCUS_VISIBLE,
                    )}
                  >
                    <span className="truncate">{scope.label}</span>
                    {selected ? (
                      <CheckRoundedIcon
                        sx={{ fontSize: 17 }}
                        className="shrink-0 text-[#00d49a]"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {tickers.map((ticker) => {
          const selected = selectedSymbol === ticker.symbol;

          return (
            <button
              key={ticker.symbol}
              type="button"
              onClick={() => onTickerSelect(ticker.symbol)}
              aria-pressed={selected}
              className={[
                "grid min-h-[76px] w-[12.5rem] shrink-0 grid-cols-[minmax(0,1fr)_5.8rem] items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                selected
                  ? "border-[#00b884]/60 bg-[#00b884]/10"
                  : "border-white/10 bg-white/[0.035] hover:border-[#00b884]/45 hover:bg-white/[0.055]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b8cff]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
              ].join(" ")}
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-extrabold uppercase text-[#8fc7ff]">
                  {ticker.label}
                </span>
                <span className="mt-1 block truncate text-base font-extrabold text-white">
                  {ticker.value}
                </span>
                <span className={`mt-1 block truncate text-xs font-bold ${toneClass[ticker.tone]}`}>
                  {ticker.change}
                </span>
              </span>
              <span className={`justify-self-end ${toneClass[ticker.tone]}`}>
                <MarketNewsSparkline data={ticker.sparkline} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
