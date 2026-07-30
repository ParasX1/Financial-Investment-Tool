import { describe, expect, it, jest } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { WatchlistRow } from "./WatchlistRow";
import type { WatchlistItem, WatchlistQuote } from "../types";

const baseItem: WatchlistItem = {
  createdAt: "2026-07-15T00:00:00.000Z",
  note: "Review the next result",
  position: 0,
  symbol: "CBA.AX",
  targetPrice: 120,
  updatedAt: "2026-07-15T00:00:00.000Z",
  userId: "00000000-0000-4000-8000-000000000001",
};

const baseQuote: WatchlistQuote = {
  change: -1,
  changePercent: -0.5,
  currency: "AUD",
  exchange: "ASX",
  longName: "Commonwealth Bank",
  marketState: "CLOSED",
  previousClose: 121,
  price: 120,
  quoteTime: "2026-07-15T04:00:00.000Z",
  shortName: null,
  symbol: "CBA.AX",
};

function renderRow(
  quote: WatchlistQuote | null | undefined,
  item: WatchlistItem = baseItem,
  busy = false,
  isMonitored = false,
) {
  return renderToStaticMarkup(
    <WatchlistRow
      busy={busy}
      isMonitored={isMonitored}
      canMoveDown
      canMoveUp
      item={item}
      quote={quote}
      onEdit={jest.fn()}
      onMonitor={jest.fn()}
      onMoveDown={jest.fn()}
      onMoveUp={jest.fn()}
      onRemove={jest.fn()}
    />,
  );
}

describe("WatchlistRow", () => {
  it("labels closed and timestamped provider quotes for beginners", () => {
    const markup = renderToStaticMarkup(
      <WatchlistRow
        busy={false}
        isMonitored={false}
        canMoveDown={false}
        canMoveUp={false}
        item={{
          createdAt: "2026-07-15T00:00:00.000Z",
          note: "Review the next result",
          position: 0,
          symbol: "CBA.AX",
          targetPrice: 120,
          updatedAt: "2026-07-15T00:00:00.000Z",
          userId: "00000000-0000-4000-8000-000000000001",
        }}
        quote={{
          change: -1,
          changePercent: -0.5,
          currency: "AUD",
          exchange: "ASX",
          longName: "Commonwealth Bank",
          marketState: "CLOSED",
          previousClose: 121,
          price: 120,
          quoteTime: "2026-07-15T04:00:00.000Z",
          shortName: null,
          symbol: "CBA.AX",
        }}
        onEdit={jest.fn()}
        onMonitor={jest.fn()}
      onMoveDown={jest.fn()}
        onMoveUp={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    expect(markup).toContain("Market closed");
    expect(markup).toContain("Quote as of");
    expect(markup).not.toContain("not an alert or recommendation");
  });

  it("exposes an accessible control for the selected market monitor", () => {
    const markup = renderRow(baseQuote, baseItem, false, true);

    expect(markup).toContain('aria-label="Monitor CBA.AX price trend"');
    expect(markup).toContain('aria-controls="watchlist-market-monitor"');
    expect(markup).toContain('aria-expanded="true"');
  });
  it("renders pending, unavailable, neutral, and extended-session quote states", () => {
    const pending = renderRow(undefined, { ...baseItem, note: null, targetPrice: null });
    const unavailable = renderRow(null, { ...baseItem, note: null, targetPrice: null });
    const unavailablePlaceholder = renderRow({
      ...baseQuote,
      changePercent: 1.25,
      currency: null,
      exchange: null,
      longName: null,
      marketState: "REGULAR",
      price: null,
      quoteTime: "not-a-date",
      shortName: "CBA",
    });
    const neutralPreMarket = renderRow({
      ...baseQuote,
      changePercent: 0,
      currency: "INVALID",
      marketState: "PREPRE",
      quoteTime: null,
    }, baseItem, true);
    const afterHours = renderRow({ ...baseQuote, marketState: "POSTPOST" });
    const unknown = renderRow({
      ...baseQuote,
      changePercent: null,
      longName: null,
      marketState: "HALTED",
      shortName: null,
    });

    expect(pending).toContain("Loading…");
    expect(pending).toContain("Add note");
    expect(unavailable).toContain("Quote unavailable");
    expect(unavailablePlaceholder).toContain("Quote unavailable");
    expect(unavailablePlaceholder).not.toContain("↑ 1.25%");
    expect(unavailablePlaceholder).not.toContain("Market open");
    expect(neutralPreMarket).toContain("→ 0.00%");
    expect(neutralPreMarket).toContain("Pre-market");
    expect(neutralPreMarket).toContain("disabled");
    expect(afterHours).toContain("After hours");
    expect(unknown).toContain("Daily change unavailable");
    expect(unknown).toContain("Company name unavailable");
    expect(unknown).toContain("Market status unavailable");
  });
});
