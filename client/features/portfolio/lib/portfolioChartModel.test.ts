import { toCorrelationHeatMapModel } from "./portfolioChartModel";

describe("Portfolio chart models", () => {
  it("keeps missing correlation overlap as N/A rather than inventing zero", () => {
    const model = toCorrelationHeatMapModel({
      AAPL: { AAPL: 1, MSFT: 0.42 },
      MSFT: { AAPL: 0.42, MSFT: 1 },
      SPY: { SPY: 1 },
    });

    expect(model.labels).toEqual(["AAPL", "MSFT", "SPY"]);
    expect(model.values[0]).toEqual([1, 0.42, null]);
    expect(model.values[2]).toEqual([null, null, 1]);
  });
});
