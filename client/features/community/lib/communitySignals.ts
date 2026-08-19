// File purpose: Derives neutral Community post context for search, ranking, and UI without implying investment-quality judgments.
import type { PostUI } from "../types";
import { MAX_COMMUNITY_TICKERS } from "./communityTickers";
import { getCommunityPostTypeLabel } from "./communityPostMetadata";

export type CommunityPostSignals = {
  tickers: string[];
  topicLabels: string[];
  primaryLabel: string;
  emptySignalLabel: string;
  sourceCount: number;
  sourceDomains: string[];
};

const SOURCE_URL_PATTERN = /https?:\/\/[^\s)\]]+/gi;

function uniqueLabels(labels: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const label of labels) {
    const clean = label.trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }

  return result;
}

function collectSourceUrls(post: PostUI) {
  const urls: string[] = post.body.match(SOURCE_URL_PATTERN) ?? [];
  if (post.sourceUrl) urls.push(post.sourceUrl);
  return uniqueLabels(urls);
}

export function countCommunitySources(post: PostUI) {
  return collectSourceUrls(post).length;
}

export function getCommunitySourceDomains(post: PostUI) {
  return collectSourceUrls(post)
    .map((url) => {
      try {
        return new URL(url).hostname.replace(/^www\./i, "");
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

export function getCommunityTickers(post: PostUI) {
  const persistedSymbol = post.symbol ? `$${post.symbol}` : null;
  return uniqueLabels([
    ...(post.tickers ?? []).map((ticker) => `$${ticker}`),
    ...post.tags.filter((tag) => tag.startsWith("$")),
    ...(persistedSymbol ? [persistedSymbol] : []),
  ]).slice(0, MAX_COMMUNITY_TICKERS);
}

function getCommunityTopicLabels(post: PostUI) {
  return uniqueLabels(post.tags.filter((tag) => !tag.startsWith("$"))).slice(
    0,
    4,
  );
}

export function getCommunityPostSignals(post: PostUI): CommunityPostSignals {
  const tickers = getCommunityTickers(post);
  const topicLabels = getCommunityTopicLabels(post);
  const sourceDomains = getCommunitySourceDomains(post);

  return {
    tickers,
    topicLabels,
    primaryLabel: getCommunityPostTypeLabel(post.postType ?? "discussion"),
    emptySignalLabel:
      tickers.length || sourceDomains.length
        ? "Research context added"
        : "No ticker or source added",
    sourceCount: sourceDomains.length,
    sourceDomains,
  };
}

export function getCommunitySignalScore(
  post: PostUI,
  {
    commentCount = post.commentCount,
    now = Date.now(),
  }: { commentCount?: number; now?: number } = {},
) {
  const ageHours = Math.max(0, (now - post.sortTime) / (1000 * 60 * 60));
  const recencyScore =
    ageHours <= 1 ? 10 : ageHours <= 24 ? 6 : ageHours <= 168 ? 3 : 0;

  return post.votes * 10 + commentCount * 4 + recencyScore;
}
