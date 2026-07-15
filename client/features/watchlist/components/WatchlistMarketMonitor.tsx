import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import Link from "next/link";
import { MarketLineChart } from "@/features/market-data/components/MarketLineChart";
import { useMarketChart } from "@/features/market-data/hooks/useMarketChart";
import type { MarketChartSnapshot } from "@/features/market-data/types";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import type { WatchlistItem, WatchlistQuote } from "../types";
import sharedStyles from "../styles/watchlist.module.css";
import styles from "../styles/watchlistMarketMonitor.module.css";

export interface WatchlistMarketMonitorChartState {
  data: MarketChartSnapshot | null;
  error: string | null;
  lastUpdated: Date | null;
  loading: boolean;
  refresh: () => void;
  refreshing: boolean;
}

function formatPrice(value: number | null, currency: string | null) {
  if (value === null) return "Quote unavailable";
  try {
    return new Intl.NumberFormat(undefined, {
      ...(currency ? { currency, style: "currency" as const } : {}),
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

function formatQuoteTime(value: string | null) {
  if (!value) return "Quote time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Quote time unavailable";
  return (
    "As of " +
    new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(date)
  );
}

function marketStateView(value: string | null) {
  switch (value?.toUpperCase()) {
    case "REGULAR":
      return {
        cadence: "Prices 15s · chart 30s",
        label: "Market open",
        tone: styles.monitorStateOpen,
      };
    case "PRE":
    case "PREPRE":
    case "POST":
    case "POSTPOST":
      return {
        cadence: "Regular-session price/chart · checks 30s",
        label: value.toUpperCase().startsWith("PRE")
          ? "Pre-market"
          : "After hours",
        tone: styles.monitorStateExtended,
      };
    case "CLOSED":
      return {
        cadence: "Updates every 5 min",
        label: "Market closed",
        tone: styles.monitorStateClosed,
      };
    default:
      return {
        cadence: "Checks every 60s",
        label: "Market status unavailable",
        tone: styles.monitorStateUnknown,
      };
  }
}

function changeView(change: number | null, changePercent: number | null) {
  if (change === null || changePercent === null) {
    return {
      className: sharedStyles.changeNeutral,
      label: "Daily change unavailable",
    };
  }
  const direction = change > 0 ? "↑" : change < 0 ? "↓" : "→";
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  return {
    className:
      change > 0
        ? sharedStyles.changePositive
        : change < 0
          ? sharedStyles.changeNegative
          : sharedStyles.changeNeutral,
    label:
      direction +
      " " +
      sign +
      Math.abs(change).toFixed(2) +
      " (" +
      sign +
      Math.abs(changePercent).toFixed(2) +
      "%)",
  };
}

export function refreshMarketMonitor(
  onRefreshQuotes: () => void,
  onRefreshChart: () => void,
) {
  onRefreshQuotes();
  onRefreshChart();
}

export function WatchlistMarketMonitorView({
  chartState,
  item,
  onClose,
  onRefreshQuotes,
  quote,
  quoteRefreshing,
}: {
  chartState: WatchlistMarketMonitorChartState;
  item: WatchlistItem;
  onClose: () => void;
  onRefreshQuotes: () => void;
  quote: WatchlistQuote | null | undefined;
  quoteRefreshing: boolean;
}) {
  const chart = chartState.data;
  const marketState = quote?.marketState ?? chart?.marketState ?? null;
  const state = marketStateView(marketState);
  const price = quote?.price ?? chart?.regularMarketPrice ?? null;
  const currency = quote?.currency ?? chart?.currency ?? null;
  const previousClose = quote?.previousClose ?? chart?.previousClose ?? null;
  const quoteTime = quote?.quoteTime ?? chart?.quoteTime ?? null;
  const change = changeView(
    quote?.change ?? null,
    quote?.changePercent ?? null,
  );
  const companyName = quote?.longName ?? quote?.shortName ?? null;
  const refreshing = quoteRefreshing || chartState.refreshing;

  return (
    <section
      className={styles.monitorPanel}
      aria-labelledby="watchlist-monitor-title"
      id="watchlist-market-monitor"
    >
      <header className={styles.monitorHeader}>
        <h2 id="watchlist-monitor-title" className={styles.monitorTitle}>
          {item.symbol} Market Monitor
        </h2>
        <div className={styles.monitorActions}>
          <button
            type="button"
            className={cn(
              sharedStyles.secondaryButton,
              styles.monitorRefreshButton,
              FIT_FOCUS_VISIBLE,
            )}
            onClick={refreshMarketMonitor.bind(
              null,
              onRefreshQuotes,
              chartState.refresh,
            )}
            disabled={refreshing}
            aria-label={"Refresh " + item.symbol + " market monitor"}
          >
            <RefreshRoundedIcon fontSize="small" aria-hidden="true" />
            {refreshing ? "Updating…" : "Refresh monitor"}
          </button>
          <button
            type="button"
            className={cn(sharedStyles.iconAction, FIT_FOCUS_VISIBLE)}
            onClick={onClose}
            aria-label={"Close " + item.symbol + " market monitor"}
            title="Close market monitor"
          >
            <CloseRoundedIcon fontSize="small" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className={styles.monitorGrid}>
        <div className={styles.monitorSummary}>
          <div>
            {companyName ? (
              <p className={styles.monitorCompany}>{companyName}</p>
            ) : null}
            <strong className={styles.monitorPrice}>
              {formatPrice(price, currency)}
            </strong>
            <p className={cn(styles.monitorChange, change.className)}>
              {change.label}
            </p>
          </div>

          <div className={styles.monitorStatus}>
            <p>
              <span
                className={cn(styles.monitorStateDot, state.tone)}
                aria-hidden="true"
              />
              {state.label} · {formatQuoteTime(quoteTime)}
            </p>
            <p>{state.cadence} · Data may be delayed.</p>
          </div>

          <Link
            href={"/MarketNews?q=" + encodeURIComponent(item.symbol)}
            className={cn(
              styles.monitorNewsLink,
              FIT_FOCUS_VISIBLE,
            )}
          >
            View related news
            <OpenInNewRoundedIcon fontSize="small" aria-hidden="true" />
          </Link>
        </div>

        <div className={styles.monitorChartCard}>
          <div className={styles.monitorChartHeading}>
            <div>
              <span>1D price trend</span>
              <small>1-minute snapshots</small>
            </div>
            {chartState.refreshing && chart ? <span>Updating trend…</span> : null}
          </div>

          {chartState.loading && !chart ? (
            <div className={styles.monitorChartLoading} role="status">
              Loading one-day trend…
            </div>
          ) : chartState.error && !chart ? (
            <div className={styles.monitorChartError} role="status">
              <p>{chartState.error}</p>
              <button
                type="button"
                className={cn(sharedStyles.textButton, FIT_FOCUS_VISIBLE)}
                onClick={chartState.refresh}
              >
                Try chart again
              </button>
            </div>
          ) : chart ? (
            <MarketLineChart
              currency={chart.currency ?? currency}
              points={chart.points}
              previousClose={chart.previousClose ?? previousClose}
              symbol={item.symbol}
            />
          ) : (
            <div className={styles.monitorChartError} role="status">
              Intraday trend is not available yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function WatchlistMarketMonitor({
  item,
  onClose,
  onRefreshQuotes,
  quote,
  quoteRefreshing,
}: {
  item: WatchlistItem;
  onClose: () => void;
  onRefreshQuotes: () => void;
  quote: WatchlistQuote | null | undefined;
  quoteRefreshing: boolean;
}) {
  const chartState = useMarketChart(item.symbol);

  return (
    <WatchlistMarketMonitorView
      chartState={chartState}
      item={item}
      onClose={onClose}
      onRefreshQuotes={onRefreshQuotes}
      quote={quote}
      quoteRefreshing={quoteRefreshing}
    />
  );
}
