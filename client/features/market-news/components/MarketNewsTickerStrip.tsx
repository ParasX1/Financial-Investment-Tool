import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import type {
  MarketNewsMarketScope,
  MarketNewsMarketScopeId,
  MarketNewsTicker,
} from "../types";
import { MarketNewsSparkline } from "./MarketNewsSparkline";
import styles from "../styles/marketNews.module.css";

const toneClass = {
  negative: "text-[var(--market-news-negative)]",
  neutral: "text-[#b9c1d0]",
  positive: "text-[var(--market-news-positive)]",
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
  return (
    <section aria-label="Market snapshot" className="min-w-0">
      <nav className={styles.scopeGrid} aria-label="Market scopes">
        {marketScopes.map((scope) => {
          const selected = scope.id === marketScope.id;

          return (
            <button
              key={scope.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onMarketScopeChange(scope.id)}
              className={cn(
                styles.scopeButton,
                selected ? styles.scopeButtonActive : "",
                FIT_FOCUS_VISIBLE,
              )}
            >
              <span className={styles.scopeIcon} aria-hidden="true">
                <PublicRoundedIcon sx={{ fontSize: 16 }} />
              </span>
              <span className="min-w-0">
                <span className={styles.scopeShortLabel}>
                  {scope.shortLabel}
                </span>
                <span className={styles.scopeLabel}>{scope.label}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className={styles.tickerScroller}>
        {tickers.map((ticker) => {
          const selected = selectedSymbol === ticker.symbol;

          return (
            <button
              key={ticker.symbol}
              type="button"
              onClick={() => onTickerSelect(ticker.symbol)}
              aria-pressed={selected}
              className={[
                "grid min-h-[76px] w-[13.25rem] shrink-0 grid-cols-[minmax(0,1fr)_4.25rem] items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                selected
                  ? "border-[#5367ff]/55 bg-[#5367ff]/10"
                  : "border-[var(--fit-color-border-subtle)] bg-white/[0.035] hover:border-[#5367ff]/45 hover:bg-white/[0.055]",
                FIT_FOCUS_VISIBLE,
              ].join(" ")}
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-extrabold uppercase text-[#8fc7ff]">
                  {ticker.label}
                </span>
                <span className="mt-1 block whitespace-nowrap text-[15px] font-extrabold tabular-nums text-white">
                  {ticker.value}
                </span>
                <span
                  className={`mt-1 block whitespace-nowrap text-xs font-bold tabular-nums ${toneClass[ticker.tone]}`}
                >
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
