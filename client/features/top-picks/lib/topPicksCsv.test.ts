import { describe, expect, it } from "@jest/globals";
import { buildTopPicksCsv } from "./topPicksCsv";
import { TOP_PICKS_COLUMNS } from "./topPicksColumns";

const row = (symbol: string, name: string) => ({
  symbol,
  name,
  industry: "Technology",
  ret1y: 0.1234,
  sharpe: 1.23,
  sortino: 1.67,
  volatility: 0.215,
  maxDD: -0.149,
  beta: 0.87,
  alpha: 0.034,
  infoRatio: 0.22,
});

describe("buildTopPicksCsv", () => {
  it("exports visible columns with rank and formatted values", () => {
    const csv = buildTopPicksCsv(
      [row("AAA", 'ACME "Alpha"')],
      TOP_PICKS_COLUMNS.slice(0, 4),
    );

    expect(csv).toContain('"Rank","Symbol","Company","Cumulative return"');
    expect(csv).toContain('"1","AAA","ACME ""Alpha""","+12.3%"');
  });

  it("exports an infinite Sortino status as Unbounded", () => {
    const csv = buildTopPicksCsv(
      [
        {
          ...row("BOUNDLESS", "Boundless Corp"),
          sortino: null,
          metricStatus: { sortino: "infinite" as const },
        },
      ],
      TOP_PICKS_COLUMNS.filter((column) =>
        ["symbol", "sortino"].includes(column.key),
      ),
    );

    expect(csv).toContain('"BOUNDLESS","Unbounded"');
    expect(csv).not.toContain('"BOUNDLESS","—"');
  });

  it("neutralizes spreadsheet formulas in exported text fields", () => {
    const csv = buildTopPicksCsv(
      [row("=1+1", "  @SUM(A1:A2)")],
      TOP_PICKS_COLUMNS.filter((column) =>
        ["symbol", "name"].includes(column.key),
      ),
    );

    expect(csv).toContain('"\'=1+1","\'  @SUM(A1:A2)"');
    expect(csv).not.toContain('"=1+1","  @SUM(A1:A2)"');
  });
});
