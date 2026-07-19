// File purpose: Tests Community smart tag detection, normalization, and default selection behavior.
import {
  detectTickerTags,
  getDefaultSelectedTags,
  getSmartTagSuggestions,
  inferTags,
  mergeSelectedTagSuggestions,
  normalizeSelectedTags,
} from "./smartTags";

describe("Community smart tag suggestions", () => {
  it("suggests post type, topic, and ticker tags from discussion copy", () => {
    const suggestions = getSmartTagSuggestions({
      title: "NVDA earnings risk after guidance",
      body: "I am comparing Nvidia revenue growth, valuation, and options IV before earnings.",
    });

    expect(suggestions.map((item) => item.label)).toEqual(
      expect.arrayContaining(["Analysis", "Earnings", "Risk", "$NVDA"]),
    );
  });

  it("detects explicit tickers and common company names", () => {
    expect(
      detectTickerTags("Watching $AAPL, Microsoft, and Nvidia after earnings"),
    ).toEqual(["$AAPL", "$MSFT", "$NVDA"]);
  });

  it("does not treat common finance acronyms as stock tickers", () => {
    expect(detectTickerTags("AI ETF CPI GDP and IPO risk")).toEqual([]);
  });

  it("keeps known market ETFs when they are written like tickers", () => {
    expect(detectTickerTags("Comparing SPY and QQQ momentum")).toEqual([
      "$SPY",
      "$QQQ",
    ]);
  });

  it("detects common ASX tickers with exchange suffixes", () => {
    expect(
      detectTickerTags("Watching $CBA.AX, BHP.AX, and NAB after the ASX open"),
    ).toEqual(["$CBA.AX", "$BHP.AX", "$NAB.AX"]);
  });

  it("normalizes common bare ASX tickers to Yahoo-style symbols", () => {
    expect(detectTickerTags("Comparing CBA and BHP momentum")).toEqual([
      "$CBA.AX",
      "$BHP.AX",
    ]);
    expect(normalizeSelectedTags(["$cba", "$BHP"])).toEqual([
      "$CBA.AX",
      "$BHP.AX",
    ]);
  });

  it("returns compact post tags for the feed", () => {
    expect(
      inferTags("Can a momentum backtest beat SPY during CPI weeks?"),
    ).toEqual(["Question", "Backtesting", "Momentum", "$SPY"]);
  });

  it("normalizes selected tags before persistence", () => {
    expect(
      normalizeSelectedTags([" Risk ", "$nvda", "$FAKE", "Risk", "<script>"]),
    ).toEqual(["Risk", "$NVDA"]);
  });

  it("keeps selected tags visible even when suggestions change", () => {
    const suggestions = getSmartTagSuggestions(
      "Portfolio allocation for Microsoft",
    );

    expect(
      mergeSelectedTagSuggestions(["Risk"], suggestions).map(
        (item) => item.label,
      ),
    ).toEqual(expect.arrayContaining(["Risk", "Portfolio", "$MSFT"]));
  });

  it("keeps ticker suggestions out of topic defaults", () => {
    const selectedTags = getDefaultSelectedTags({
      title: "TSLA options risk before earnings",
      body: "Looking at implied volatility and downside hedges.",
      tags: [],
    });

    expect(selectedTags).toEqual(
      expect.arrayContaining(["Earnings", "Risk", "Options"]),
    );
    expect(selectedTags).not.toContain("$TSLA");
  });
});
