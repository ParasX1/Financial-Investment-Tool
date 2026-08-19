import { renderToStaticMarkup } from "react-dom/server";
import type { MetricsResponse } from "@/lib/market-metrics";
import {
  getPortfolioTableModel,
  PortfolioDataTable,
} from "./PortfolioDataTable";

describe("PortfolioDataTable models", () => {
  it("ranks finite bar metrics while preserving a row per usable symbol", () => {
    const volatility = getPortfolioTableModel(
      {
        tickers: ["AAPL", "MSFT", "BHP"],
        metricType: "VolatilityAnalysis",
        series: { singleValue: { AAPL: 0.32, MSFT: 0.18 } },
      },
      "VolatilityAnalysis",
    );
    const beta = getPortfolioTableModel(
      {
        tickers: ["AAPL", "MSFT"],
        metricType: "BetaAnalysis",
        series: { singleValue: { AAPL: 0.8, MSFT: 1.2 } },
      },
      "BetaAnalysis",
    );

    expect(volatility.columns).toEqual(["Symbol", "Annualised volatility"]);
    expect(volatility.rows.map(([symbol]) => symbol)).toEqual(["AAPL", "MSFT"]);
    expect(volatility.keyFigures[0]).toEqual({
      label: "Lowest in comparison",
      value: "MSFT · +18%",
    });
    expect(beta.keyFigures[0]).toEqual({
      label: "Largest reading",
      value: "MSFT · +1.2",
    });
  });

  it("adds observations and readable reasons when values and statuses mix", () => {
    const model = getPortfolioTableModel(
      {
        tickers: ["AAPL", "MSFT", "BHP", "NVDA"],
        metricType: "SortinoRatioVisualization",
        series: {
          singleValue: { AAPL: 1.25 },
          singleValueStatuses: {
            AAPL: { status: "ok" },
            MSFT: { status: "infinite", observations: 42 },
            BHP: { status: "invalid" },
            NVDA: { status: "insufficient_overlap", observations: 9 },
          },
        },
      },
      "SortinoRatioVisualization",
    );

    expect(model.columns).toEqual(["Symbol", "Sortino ratio", "Observations"]);
    expect(model.rows).toEqual([
      ["AAPL", "+1.25", "—"],
      ["MSFT", "Unbounded · no downside shortfall", "42"],
      ["BHP", "Invalid sample", "—"],
      ["NVDA", "insufficient overlap", "9"],
    ]);
    expect(model.keyFigures[0]).toEqual({
      label: "Highest in comparison",
      value: "AAPL · +1.25",
    });
  });

  it("summarises ending return and worst drawdown from time-series responses", () => {
    const cumulative = getPortfolioTableModel(
      {
        tickers: ["AAPL", "MSFT"],
        metricType: "CumulativeReturnComparison",
        series: {
          timeSeries: {
            AAPL: [
              { date: "2026-01-02", value: 0 },
              { date: "2026-07-31", value: 0.2 },
            ],
            MSFT: [],
          },
        },
      },
      "CumulativeReturnComparison",
    );
    const drawdown = getPortfolioTableModel(
      {
        tickers: ["AAPL", "BHP"],
        metricType: "MaxDrawdownAnalysis",
        series: {
          timeSeries: {
            AAPL: [
              { date: "2026-01-02", value: 0 },
              { date: "2026-03-01", value: -0.2 },
            ],
            BHP: [
              { date: "2026-01-02", value: -0.05 },
              { date: "2026-03-01", value: -0.4 },
            ],
          },
        },
      },
      "MaxDrawdownAnalysis",
    );

    expect(cumulative.rows).toEqual([
      ["AAPL", "+20%", "2"],
      ["MSFT", "0%", "0"],
    ]);
    expect(cumulative.keyFigures[0]).toEqual({
      label: "Best ending return",
      value: "AAPL · +20%",
    });
    expect(drawdown.rows).toEqual([
      ["AAPL", "-20%", "2"],
      ["BHP", "-40%", "2"],
    ]);
    expect(drawdown.keyFigures[0]).toEqual({
      label: "Deepest drawdown",
      value: "BHP · -40%",
    });
  });

  it("lists unique correlation pairs and identifies the lowest pair", () => {
    const data: MetricsResponse = {
      tickers: ["AAPL", "MSFT", "BHP"],
      metricType: "MarketCorrelationAnalysis",
      series: {
        correlationMatrix: {
          AAPL: { AAPL: 1, MSFT: 0.7, BHP: 0.2 },
          MSFT: { AAPL: 0.7, MSFT: 1, BHP: -0.1 },
          BHP: { AAPL: 0.2, MSFT: -0.1, BHP: 1 },
        },
      },
    };

    const model = getPortfolioTableModel(data, "MarketCorrelationAnalysis");
    const empty = getPortfolioTableModel(
      { ...data, series: { correlationMatrix: {} } },
      "MarketCorrelationAnalysis",
    );

    expect(model.rows).toEqual([
      ["AAPL / MSFT", "0.7"],
      ["AAPL / BHP", "0.2"],
      ["BHP / MSFT", "-0.1"],
    ]);
    expect(model.keyFigures[0]).toEqual({
      label: "Lowest-correlation pair",
      value: "BHP / MSFT · -0.1",
    });
    expect(empty.keyFigures).toEqual([]);
  });

  it("handles unavailable frontier allocations and empty simulations", () => {
    const unavailable = getPortfolioTableModel(
      {
        tickers: ["AAPL", "MSFT"],
        metricType: "EfficientFrontierVisualization",
        series: {
          portfolio: {
            returns: [0.1],
            risks: [0.2],
            sharpe_ratios: [0.5],
            asset_order: ["AAPL", "MSFT"],
            weights: [[]],
            max_sharpe_index: 0,
            min_volatility_index: 0,
          },
        },
      },
      "EfficientFrontierVisualization",
    );
    const missingPortfolio = getPortfolioTableModel(
      {
        tickers: [],
        metricType: "EfficientFrontierVisualization",
        series: {},
      },
      "EfficientFrontierVisualization",
    );
    const emptyPortfolio = getPortfolioTableModel(
      {
        tickers: [],
        metricType: "EfficientFrontierVisualization",
        series: {
          portfolio: {
            returns: [],
            risks: [],
            sharpe_ratios: [],
            asset_order: [],
            weights: [],
            max_sharpe_index: 0,
            min_volatility_index: 0,
          },
        },
      },
      "EfficientFrontierVisualization",
    );

    expect(unavailable.rows[0][4]).toBe("Allocation unavailable");
    expect(unavailable.rows[1][4]).toBe("Allocation unavailable");
    expect(missingPortfolio).toEqual({ columns: [], rows: [], keyFigures: [] });
    expect(emptyPortfolio).toEqual({ columns: [], rows: [], keyFigures: [] });
  });

  it("renders semantic headers and escapes external response text", () => {
    const markup = renderToStaticMarkup(
      PortfolioDataTable({
        model: {
          columns: ["Symbol", "Reading"],
          rows: [
            ["AAPL", "+12%"],
            ["A&B", "<unavailable>"],
          ],
          keyFigures: [],
        },
      }),
    );

    expect(markup).toContain("View summary values and accessible data table");
    expect(markup).toContain('<th scope="col">Symbol</th>');
    expect(markup).toContain('<th scope="row">AAPL</th>');
    expect(markup).toContain("A&amp;B");
    expect(markup).toContain("&lt;unavailable&gt;");
  });
});
