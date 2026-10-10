import { describe, expect, it } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import type { TopPicksRow } from "../types";
import { TopPicksTable } from "./TopPicksTable";

const savedRow: TopPicksRow = {
  symbol: "BOUNDLESS",
  name: "Boundless Corp",
  industry: "Technology",
  ret1y: 0.1,
  sharpe: 1.2,
  sortino: null,
  volatility: 0.2,
  maxDD: -0.1,
  beta: 1,
  alpha: 0.03,
  infoRatio: 0.15,
  metricStatus: { sortino: "infinite" },
};

const baseProps = {
  rows: [savedRow],
  loading: false,
  error: null,
  visibleKeys: ["symbol", "sortino"] as ("symbol" | "sortino")[],
  sort: { key: "sharpe" as const, dir: "desc" as const },
  page: 1,
  pageSize: 25,
  totalPages: 2,
  onSortChange: () => undefined,
  onPageChange: () => undefined,
  onPageSizeChange: () => undefined,
};

describe("TopPicksTable", () => {
  it("renders an infinite Sortino status as Unbounded", () => {
    const markup = renderToStaticMarkup(
      <TopPicksTable {...baseProps} />,
    );

    expect(markup).toContain("BOUNDLESS");
    expect(markup).toContain("Unbounded");
    expect(markup).toContain(
      'aria-label="Sortino ratio: Sortino ratio using downside deviation; Unbounded means no downside deviation."',
    );
  });

  it("keeps saved rows and pagination available after a background refresh failure", () => {
    const markup = renderToStaticMarkup(
      <TopPicksTable
        {...baseProps}
        error="Unable to refresh Top Picks. Retrying automatically."
      />,
    );

    expect(markup).toContain("BOUNDLESS");
    expect(markup).not.toContain("Top Picks could not be loaded.");
    expect(markup).toMatch(
      /<button(?![^>]* disabled(?:=|[\s>]))[^>]*aria-label="Go to page 2"/,
    );
  });

  it("shows the failure state and disables pagination when no saved rows exist", () => {
    const markup = renderToStaticMarkup(
      <TopPicksTable
        {...baseProps}
        rows={[]}
        error="Top Picks are temporarily unavailable."
      />,
    );

    expect(markup).toContain("Top Picks could not be loaded.");
    expect(markup).not.toContain("BOUNDLESS");
    expect(markup).toMatch(
      /<button(?=[^>]* disabled="")[^>]*aria-label="Go to page 2"/,
    );
  });
});
