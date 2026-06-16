// File purpose: Tests feed-level investor signal aggregation for Community.
import { createLocalPost } from "./communityMappers";
import { getCommunityFeedInsights } from "./communityFeedInsights";

describe("Community feed insights", () => {
  it("summarizes tickers, sourced posts, and reply activity in the visible feed", () => {
    const nvda = {
      ...createLocalPost({
        title: "NVDA earnings thesis",
        body: "Source: https://example.com/nvda Guidance matters this quarter.",
        tags: ["Earnings", "$NVDA"],
      }),
      id: "nvda",
    };
    const tsla = {
      ...createLocalPost({
        title: "TSLA delivery catalyst",
        body: "Tesla deliveries could move sentiment this week.",
        tags: ["News", "$TSLA"],
      }),
      id: "tsla",
    };

    const insights = getCommunityFeedInsights([nvda, tsla], {
      nvda: 5,
      tsla: 1,
    });

    expect(insights.postCount).toBe(2);
    expect(insights.sourceBackedCount).toBe(1);
    expect(insights.activeReplyCount).toBe(6);
    expect(insights.topTickers).toEqual([
      { label: "$NVDA", count: 1 },
      { label: "$TSLA", count: 1 },
    ]);
    expect(insights.topSetups.map((item) => item.label)).toEqual(
      expect.arrayContaining(["Earnings watch", "Catalyst watch"]),
    );
  });
});
