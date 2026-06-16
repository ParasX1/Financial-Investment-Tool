// File purpose: Tests investor-facing Community signal extraction and scoring helpers.
import { createLocalPost } from "./communityMappers";
import {
  getCommunityPostSignals,
  getCommunitySignalScore,
} from "./communitySignals";

describe("Community investment signals", () => {
  it("extracts tickers, setup type, horizon, and source strength from a post", () => {
    const post = createLocalPost({
      title: "NVDA earnings setup for next quarter",
      body: "Source: https://example.com/nvda-earnings I am looking for a swing setup after guidance.",
      tags: ["Earnings", "$NVDA", "Strategy"],
    });

    const signals = getCommunityPostSignals(post);

    expect(signals.tickers).toEqual(["$NVDA"]);
    expect(signals.primaryLabel).toBe("Earnings watch");
    expect(signals.horizon.label).toBe("Swing");
    expect(signals.evidence.label).toBe("Source-backed");
    expect(signals.sourceCount).toBe(1);
  });

  it("keeps tagless posts useful without showing a noisy empty tag state", () => {
    const post = createLocalPost({
      title: "How should I size this position?",
      body: "I am weighing portfolio risk before adding more exposure.",
      tags: [],
    });

    const signals = getCommunityPostSignals(post);

    expect(signals.tickers).toEqual([]);
    expect(signals.primaryLabel).toBe("Question");
    expect(signals.topicLabels).toEqual(expect.arrayContaining(["Risk"]));
    expect(signals.emptySignalLabel).toBe("General discussion");
  });

  it("scores ticker-linked sourced posts above low-signal posts with similar votes", () => {
    const sourcedTickerPost = createLocalPost({
      title: "TSLA delivery catalyst with source",
      body: "Breaking news from https://example.com/tesla-deliveries could change sentiment this week.",
      tags: ["News", "$TSLA"],
    });
    const genericPost = createLocalPost({
      title: "General market thought",
      body: "Open for broad discussion.",
      tags: [],
    });

    expect(
      getCommunitySignalScore(sourcedTickerPost, {
        commentCount: 3,
        now: sourcedTickerPost.sortTime + 1,
      }),
    ).toBeGreaterThan(
      getCommunitySignalScore(genericPost, {
        commentCount: 3,
        now: sourcedTickerPost.sortTime + 1,
      }),
    );
  });

  it("does not let an arbitrary URL alone boost top ranking", () => {
    const sourceOnlyPost = createLocalPost({
      title: "General market thought",
      body: "I found this link https://example.com/no-context useful.",
      tags: [],
    });
    const genericPost = createLocalPost({
      title: "General market thought",
      body: "Open for broad discussion.",
      tags: [],
    });

    expect(
      getCommunitySignalScore(sourceOnlyPost, {
        commentCount: 0,
        now: sourceOnlyPost.sortTime + 1,
      }),
    ).toBeLessThanOrEqual(
      getCommunitySignalScore(genericPost, {
        commentCount: 0,
        now: sourceOnlyPost.sortTime + 1,
      }),
    );
  });
});
