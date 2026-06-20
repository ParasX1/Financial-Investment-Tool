import { describe, expect, it } from "@jest/globals";
import {
  formatMarketNewsMatchStatus,
  formatMarketNewsShownStatus,
  formatMarketNewsSourceStatus,
} from "./marketNewsStatus";

describe("marketNewsStatus", () => {
  it("formats paged topic ranges as shown stories instead of total counts", () => {
    expect(
      formatMarketNewsShownStatus({
        displayedCount: 12,
        pageStart: 0,
        topicFeedMode: true,
      }),
    ).toBe("1-12 shown");

    expect(
      formatMarketNewsShownStatus({
        displayedCount: 3,
        pageStart: 12,
        topicFeedMode: true,
      }),
    ).toBe("13-15 shown");
  });

  it("formats empty and compact layouts without implying a known total", () => {
    expect(
      formatMarketNewsShownStatus({
        displayedCount: 0,
        pageStart: 0,
        topicFeedMode: true,
      }),
    ).toBe("0 shown");

    expect(
      formatMarketNewsShownStatus({
        displayedCount: 5,
        pageStart: 0,
        topicFeedMode: false,
      }),
    ).toBe("5 shown");
  });

  it("keeps source and match labels trader-readable", () => {
    expect(
      formatMarketNewsSourceStatus({
        hasVisibleArticles: true,
        loading: true,
        providerLabel: "Google News RSS",
      }),
    ).toBe("Updating");

    expect(
      formatMarketNewsSourceStatus({
        hasVisibleArticles: false,
        loading: false,
        providerLabel: "GDELT",
      }),
    ).toBe("GDELT");

    expect(formatMarketNewsMatchStatus(false)).toBe("Broad headlines");
    expect(formatMarketNewsMatchStatus(true)).toBe("Topic matched");
  });
});
