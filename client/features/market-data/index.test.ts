import { describe, expect, it } from "@jest/globals";
import * as marketData from "./index";

describe("market data public API", () => {
  it("exposes the shared chart and quote capabilities used by page features", () => {
    expect(marketData.MarketLineChart).toEqual(expect.any(Function));
    expect(marketData.useMarketChart).toEqual(expect.any(Function));
    expect(marketData.useMarketQuotes).toEqual(expect.any(Function));
  });
});
