// File purpose: Tests neutral Community context extraction and engagement-based ranking helpers.
import { createLocalPost } from "./communityMappers";
import {
  getCommunityPostSignals,
  getCommunitySignalScore,
} from "./communitySignals";

describe("Community post context", () => {
  it("extracts explicit beginner-facing context without inferring quality labels", () => {
    const post = createLocalPost({
      title: "NVDA earnings review",
      body: "I am comparing guidance against this filing https://www.sec.gov/Archives/example.",
      tags: ["Earnings", "$NVDA"],
      postType: "analysis",
      timeFrame: null,
      symbol: "NVDA",
      sourceUrl: "https://www.nasdaq.com/articles/nvda",
    });

    const signals = getCommunityPostSignals(post);

    expect(signals.tickers).toEqual(["$NVDA"]);
    expect(signals.primaryLabel).toBe("Analysis");
    expect(signals.sourceCount).toBe(2);
    expect(signals.sourceDomains).toEqual(
      expect.arrayContaining(["sec.gov", "nasdaq.com"]),
    );
  });

  it("keeps posts neutral when no ticker or source was added", () => {
    const post = createLocalPost({
      title: "How should I size an NVDA position?",
      body: "I mention earnings, but I did not add research context.",
      tags: [],
      postType: "question",
      timeFrame: null,
      symbol: null,
      sourceUrl: null,
    });

    const signals = getCommunityPostSignals(post);

    expect(signals.tickers).toEqual([]);
    expect(signals.topicLabels).toEqual([]);
    expect(signals.primaryLabel).toBe("Question");
    expect(signals.emptySignalLabel).toBe("No ticker or source added");
  });

  it("does not let ticker or source metadata outrank similar engagement on its own", () => {
    const contextRichPost = createLocalPost({
      title: "TSLA delivery note",
      body: "Source: https://example.com/tesla-deliveries",
      tags: ["$TSLA"],
      postType: "news",
      timeFrame: null,
      symbol: "TSLA",
      sourceUrl: "https://www.reuters.com/example",
    });
    const genericPost = createLocalPost({
      title: "General market thought",
      body: "Open for broad discussion.",
      tags: [],
      postType: "discussion",
      timeFrame: null,
      symbol: null,
      sourceUrl: null,
    });

    expect(
      getCommunitySignalScore(contextRichPost, {
        commentCount: 3,
        now: contextRichPost.sortTime + 1,
      }),
    ).toBe(
      getCommunitySignalScore(genericPost, {
        commentCount: 3,
        now: contextRichPost.sortTime + 1,
      }),
    );
  });
});
