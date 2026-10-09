import { formatMetricsResponse } from ".";

describe("frontier allocation correspondence", () => {
  it("does not coerce structured or blank weights into finite zero allocations", () => {
    const result = formatMetricsResponse([], "EfficientFrontierVisualization", {
      returns: [0.1],
      risks: [0.2],
      sharpe_ratios: [0.5],
      asset_order: ["A", "B", "C", "D"],
      weights: [[[], [0.8], " ", 0.2]],
    });
    expect(result.series.portfolio?.weights).toEqual([[null, null, null, 0.2]]);
  });
  it("preserves unavailable slots and later assets after filtering invalid simulations", () => {
    const result = formatMetricsResponse(
      ["AAPL", "MSFT", "SPY"],
      "EfficientFrontierVisualization",
      {
        returns: [null, 0.12, 0.08],
        risks: [0.2, 0.25, 0.15],
        sharpe_ratios: [0.5, 0.8, 0.6],
        asset_order: ["AAPL", "MSFT", "SPY"],
        weights: [
          [0.2, 0.3, 0.5],
          [0.2, null, 0.8],
          ["bad", 0.6, 0.4],
        ],
        max_sharpe_index: 1,
        min_volatility_index: 2,
      },
    );

    expect(result.series.portfolio).toMatchObject({
      returns: [0.12, 0.08],
      asset_order: ["AAPL", "MSFT", "SPY"],
      weights: [
        [0.2, null, 0.8],
        [null, 0.6, 0.4],
      ],
      max_sharpe_index: 0,
      min_volatility_index: 1,
    });
  });

  it("keeps valid zero weights and rejects nonfinite and boolean weights in place", () => {
    const result = formatMetricsResponse([], "EfficientFrontierVisualization", {
      returns: [0.1],
      risks: [0.2],
      sharpe_ratios: [0.5],
      asset_order: ["A", "B", "C", "D", "E"],
      weights: [[0, true, Infinity, "0.3", ""]],
    });

    expect(result.series.portfolio?.weights).toEqual([
      [0, null, null, 0.3, null],
    ]);
  });
});
