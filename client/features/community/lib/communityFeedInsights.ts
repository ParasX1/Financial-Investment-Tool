// File purpose: Aggregates visible Community posts into investor-facing feed summaries.
import type { PostUI } from "../types";
import { getCommunityPostSignals } from "./communitySignals";

export type CommunityFeedInsightItem = {
  label: string;
  count: number;
};

export type CommunityFeedInsights = {
  postCount: number;
  signalPostCount: number;
  sourceBackedCount: number;
  activeReplyCount: number;
  topTickers: CommunityFeedInsightItem[];
  topSetups: CommunityFeedInsightItem[];
};

function incrementCount(map: Map<string, number>, label: string) {
  map.set(label, (map.get(label) ?? 0) + 1);
}

function sortedItems(map: Map<string, number>, limit: number) {
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function getCommunityFeedInsights(
  posts: PostUI[],
  commentCounts: Record<string, number> = {},
): CommunityFeedInsights {
  const tickerCounts = new Map<string, number>();
  const setupCounts = new Map<string, number>();
  let signalPostCount = 0;
  let sourceBackedCount = 0;
  let activeReplyCount = 0;

  for (const post of posts) {
    const signals = getCommunityPostSignals(post);
    const hasUsefulSignal =
      signals.tickers.length > 0 ||
      signals.topicLabels.length > 0 ||
      signals.sourceCount > 0 ||
      signals.primaryLabel !== "General discussion";

    if (hasUsefulSignal) signalPostCount += 1;
    if (signals.sourceCount > 0) sourceBackedCount += 1;
    activeReplyCount += commentCounts[post.id] ?? post.commentCount;

    for (const ticker of signals.tickers) {
      incrementCount(tickerCounts, ticker);
    }

    if (signals.primaryLabel !== "General discussion") {
      incrementCount(setupCounts, signals.primaryLabel);
    }
  }

  return {
    postCount: posts.length,
    signalPostCount,
    sourceBackedCount,
    activeReplyCount,
    topTickers: sortedItems(tickerCounts, 5),
    topSetups: sortedItems(setupCounts, 4),
  };
}
