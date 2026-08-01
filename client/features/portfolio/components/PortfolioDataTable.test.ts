import { getPortfolioTableModel } from "./PortfolioDataTable";

describe("Portfolio accessible data tables", () => {
  it("keeps non-numeric Sortino states informative", () => {
    const model = getPortfolioTableModel(
      {
        tickers: ["AAPL", "MSFT"],
        metricType: "SortinoRatioVisualization",
        series: {
          singleValue: {},
          singleValueStatuses: {
            AAPL: { status: "infinite", observations: 42 },
            MSFT: { status: "limited_data", observations: 1 },
          },
        },
      },
      "SortinoRatioVisualization",
    );

    expect(model.rows).toEqual([
      ["AAPL", "Unbounded · no downside shortfall", "42"],
      ["MSFT", "Limited data", "1"],
    ]);
  });

  it("labels sampled portfolio extrema without claiming exact optima", () => {
    const model = getPortfolioTableModel(
      {
        tickers: ["AAPL", "MSFT"],
        metricType: "EfficientFrontierVisualization",
        series: {
          portfolio: {
            returns: [0.1, 0.12],
            risks: [0.18, 0.21],
            sharpe_ratios: [0.5, 0.6],
            asset_order: ["AAPL", "MSFT"],
            weights: [
              [0.2, 0.8],
              [0.6, 0.4],
            ],
            max_sharpe_index: 1,
            min_volatility_index: 0,
          },
        },
      },
      "EfficientFrontierVisualization",
    );

    expect(model.rows[0][0]).toBe("Best sampled Sharpe");
    expect(model.rows[1][0]).toBe("Lowest sampled volatility");
  });
});
