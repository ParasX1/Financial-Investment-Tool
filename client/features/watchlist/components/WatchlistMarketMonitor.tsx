import * as React from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import Link from "next/link";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import {
  buildNormalizedMarketSeries,
  MARKET_CHART_RANGE_OPTIONS,
  MarketComparisonChart,
  MarketLineChart,
  useMarketChartComparison,
  type MarketChartRangeId,
  type MarketChartSnapshot,
  type MarketChartsResponse,
} from "@/features/market-data";
import { getMarketNewsRouteHref } from "@/features/market-news/lib/marketNewsRouting";
import type { WatchlistItem, WatchlistQuote } from "../types";
import sharedStyles from "../styles/watchlist.module.css";
import styles from "../styles/watchlistMarketMonitor.module.css";

interface MarketChartRequestState<T> {
  data: T | null;
  error: string | null;
  lastUpdated: Date | null;
  loading: boolean;
  refresh: () => void;
  refreshing: boolean;
}

export type WatchlistMarketMonitorChartState =
  MarketChartRequestState<MarketChartSnapshot>;

export type WatchlistMarketComparisonChartState =
  MarketChartRequestState<MarketChartsResponse>;

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
        cadence: "Prices 30s · chart 60s",
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

function pointCadenceLabel(snapshot: MarketChartSnapshot | null) {
  switch (snapshot?.interval) {
    case "1m":
      return "1-minute snapshots";
    case "15m":
      return "15-minute snapshots";
    case "1h":
      return "Hourly snapshots";
    case "1d":
      return "Daily snapshots";
    case "1wk":
      return "Weekly snapshots";
    case "1mo":
      return "Monthly snapshots";
    default:
      return "Best available interval";
  }
}

function selectedRange(rangeId: MarketChartRangeId) {
  return (
    MARKET_CHART_RANGE_OPTIONS.find((option) => option.id === rangeId) ??
    MARKET_CHART_RANGE_OPTIONS[0]
  );
}

function ChartRangeSelector({
  disabled = false,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (rangeId: MarketChartRangeId) => void;
  value: MarketChartRangeId;
}) {
  return (
    <div
      className={styles.rangeSelector}
      role="group"
      aria-label="Chart range"
    >
      {MARKET_CHART_RANGE_OPTIONS.map((range) => (
        <button
          key={range.id}
          type="button"
          className={cn(
            styles.rangeButton,
            range.id === value && styles.rangeButtonActive,
            FIT_FOCUS_VISIBLE,
          )}
          aria-pressed={range.id === value}
          onClick={() => onChange(range.id)}
          disabled={disabled}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
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
  onRangeChange = () => undefined,
  onRefreshQuotes,
  quote,
  quoteRefreshing,
  rangeId = "1d",
}: {
  chartState: WatchlistMarketMonitorChartState;
  item: WatchlistItem;
  onClose: () => void;
  onRangeChange?: (rangeId: MarketChartRangeId) => void;
  onRefreshQuotes: () => void;
  quote: WatchlistQuote | null | undefined;
  quoteRefreshing: boolean;
  rangeId?: MarketChartRangeId;
}) {
  const chart = chartState.data;
  const range = selectedRange(rangeId);
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
  const oneDayRange = rangeId === "1d";

  return (
    <section
      className={styles.monitorPanel}
      aria-labelledby="watchlist-monitor-title"
      id="watchlist-market-monitor"
    >
      <header className={styles.monitorHeader}>
        <div>
          <h2 id="watchlist-monitor-title" className={styles.monitorTitle}>
            {item.symbol} Market Monitor
          </h2>
          <p className={styles.monitorSubtitle}>
            Review price context before opening the related stories.
          </p>
        </div>
        <div className={styles.monitorActions}>
          <button
            type="button"
            className={cn(
              sharedStyles.secondaryButton,
              styles.monitorRefreshButton,
              FIT_FOCUS_VISIBLE,
            )}
            onClick={() =>
              refreshMarketMonitor(onRefreshQuotes, chartState.refresh)
            }
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
            href={getMarketNewsRouteHref({
              tickerSymbol: item.symbol,
            })}
            className={cn(styles.monitorNewsLink, FIT_FOCUS_VISIBLE)}
          >
            View related news
            <OpenInNewRoundedIcon fontSize="small" aria-hidden="true" />
          </Link>
        </div>

        <div className={styles.monitorChartCard}>
          <div className={styles.monitorChartHeading}>
            <div>
              <span>{range.label} price trend</span>
              <small>{pointCadenceLabel(chart)}</small>
            </div>
            {chartState.refreshing && chart ? <span>Updating trend…</span> : null}
          </div>

          <ChartRangeSelector
            disabled={chartState.loading}
            value={rangeId}
            onChange={onRangeChange}
          />

          {chartState.loading && !chart ? (
            <div className={styles.monitorChartLoading} role="status">
              {oneDayRange
                ? "Loading one-day trend…"
                : `Loading ${range.label} trend…`}
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
              pointCadenceLabel={pointCadenceLabel(chart)}
              previousClose={chart.previousClose ?? previousClose}
              rangeLabel={range.label}
              symbol={item.symbol}
            />
          ) : (
            <div className={styles.monitorChartError} role="status">
              {oneDayRange
                ? "Intraday trend is not available yet."
                : `${range.label} trend is not available yet.`}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ComparisonSummaryCard({
  item,
  quote,
}: {
  item: WatchlistItem;
  quote: WatchlistQuote | null | undefined;
}) {
  const companyName =
    quote?.longName ?? quote?.shortName ?? "Company name unavailable";
  const change = changeView(
    quote?.change ?? null,
    quote?.changePercent ?? null,
  );

  return (
    <article className={styles.comparisonSummary}>
      <div>
        <strong>{item.symbol}</strong>
        <span>{companyName}</span>
      </div>
      <div>
        <strong>{formatPrice(quote?.price ?? null, quote?.currency ?? null)}</strong>
        <span className={change.className}>{change.label}</span>
      </div>
      <Link
        href={getMarketNewsRouteHref({ tickerSymbol: item.symbol })}
        className={cn(styles.comparisonNewsLink, FIT_FOCUS_VISIBLE)}
      >
        News
        <OpenInNewRoundedIcon fontSize="small" aria-hidden="true" />
      </Link>
    </article>
  );
}

export function WatchlistMarketComparisonView({
  chartState,
  items,
  onClose,
  onRangeChange,
  onRefreshQuotes,
  quotes,
  quoteRefreshing,
  rangeId,
}: {
  chartState: WatchlistMarketComparisonChartState;
  items: readonly WatchlistItem[];
  onClose: () => void;
  onRangeChange: (rangeId: MarketChartRangeId) => void;
  onRefreshQuotes: () => void;
  quotes: Readonly<Record<string, WatchlistQuote>>;
  quoteRefreshing: boolean;
  rangeId: MarketChartRangeId;
}) {
  const range = selectedRange(rangeId);
  const series = buildNormalizedMarketSeries(chartState.data?.snapshots ?? []);
  const refreshing = quoteRefreshing || chartState.refreshing;
  const unavailableSymbols = chartState.data?.unavailableSymbols ?? [];

  return (
    <section
      className={styles.monitorPanel}
      aria-labelledby="watchlist-monitor-title"
      id="watchlist-market-monitor"
    >
      <header className={styles.monitorHeader}>
        <div>
          <h2 id="watchlist-monitor-title" className={styles.monitorTitle}>
            Market comparison
          </h2>
          <p className={styles.monitorSubtitle}>
            Compare up to four saved ideas. Each line starts at 0% at its first
            available point.
          </p>
        </div>
        <div className={styles.monitorActions}>
          <button
            type="button"
            className={cn(
              sharedStyles.secondaryButton,
              styles.monitorRefreshButton,
              FIT_FOCUS_VISIBLE,
            )}
            onClick={() =>
              refreshMarketMonitor(onRefreshQuotes, chartState.refresh)
            }
            disabled={refreshing}
            aria-label="Refresh market comparison"
          >
            <RefreshRoundedIcon fontSize="small" aria-hidden="true" />
            {refreshing ? "Updating…" : "Refresh comparison"}
          </button>
          <button
            type="button"
            className={cn(sharedStyles.iconAction, FIT_FOCUS_VISIBLE)}
            onClick={onClose}
            aria-label="Close market comparison"
            title="Close market comparison"
          >
            <CloseRoundedIcon fontSize="small" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className={styles.comparisonSummaries}>
        {items.map((item) => (
          <ComparisonSummaryCard
            key={item.symbol}
            item={item}
            quote={quotes[item.symbol]}
          />
        ))}
      </div>

      <div className={styles.comparisonChartCard}>
        <div className={styles.monitorChartHeading}>
          <div>
            <span>{range.label} relative performance</span>
            <small>Percentage change from each symbol&apos;s first point</small>
          </div>
          {chartState.refreshing && chartState.data ? (
            <span>Updating comparison…</span>
          ) : null}
        </div>

        <ChartRangeSelector
          disabled={chartState.loading}
          value={rangeId}
          onChange={onRangeChange}
        />

        {unavailableSymbols.length ? (
          <p className={styles.partialWarning} role="status">
            {unavailableSymbols.join(", ")} chart data is unavailable for this
            range. Available symbols are still shown.
          </p>
        ) : null}

        {chartState.loading && !chartState.data ? (
          <div className={styles.monitorChartLoading} role="status">
            Loading {range.label} comparison…
          </div>
        ) : chartState.error && !chartState.data ? (
          <div className={styles.monitorChartError} role="status">
            <p>{chartState.error}</p>
            <button
              type="button"
              className={cn(sharedStyles.textButton, FIT_FOCUS_VISIBLE)}
              onClick={chartState.refresh}
            >
              Try comparison again
            </button>
          </div>
        ) : (
          <MarketComparisonChart rangeLabel={range.label} series={series} />
        )}
      </div>
    </section>
  );
}

export function WatchlistMarketMonitor({
  items,
  onClose,
  onRefreshQuotes,
  quotes,
  quoteRefreshing,
}: {
  items: readonly WatchlistItem[];
  onClose: () => void;
  onRefreshQuotes: () => void;
  quotes: Readonly<Record<string, WatchlistQuote>>;
  quoteRefreshing: boolean;
}) {
  const [rangeId, setRangeId] = React.useState<MarketChartRangeId>("1d");
  const symbols = React.useMemo(
    () => items.map((item) => item.symbol),
    [items],
  );
  const chartState = useMarketChartComparison(symbols, rangeId);
  const item = items[0];

  if (!item) return null;

  if (items.length === 1) {
    const chart =
      chartState.data?.snapshots.find(
        (snapshot) => snapshot.symbol === item.symbol,
      ) ?? null;
    const unavailable = chartState.data?.unavailableSymbols.includes(
      item.symbol,
    );

    return (
      <WatchlistMarketMonitorView
        chartState={{
          data: chart,
          error:
            chartState.error ??
            (unavailable
              ? "Market chart is unavailable for this range."
              : null),
          lastUpdated: chart ? chartState.lastUpdated : null,
          loading: chartState.loading,
          refresh: chartState.refresh,
          refreshing: chartState.refreshing,
        }}
        item={item}
        onClose={onClose}
        onRangeChange={setRangeId}
        onRefreshQuotes={onRefreshQuotes}
        quote={quotes[item.symbol]}
        quoteRefreshing={quoteRefreshing}
        rangeId={rangeId}
      />
    );
  }

  return (
    <WatchlistMarketComparisonView
      chartState={chartState}
      items={items}
      onClose={onClose}
      onRangeChange={setRangeId}
      onRefreshQuotes={onRefreshQuotes}
      quotes={quotes}
      quoteRefreshing={quoteRefreshing}
      rangeId={rangeId}
    />
  );
}
