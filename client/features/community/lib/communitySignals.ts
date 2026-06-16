// File purpose: Derives investor-facing signals from Community posts without requiring a new database schema.
import type { PostUI } from "../types";
import { detectTickerTags, getSmartTagSuggestions } from "./smartTags";

export type CommunitySignalTone = "positive" | "warning" | "neutral" | "info";

export type CommunitySignalFacet = {
  label: string;
  tone: CommunitySignalTone;
};

export type CommunityPostSignals = {
  tickers: string[];
  topicLabels: string[];
  primaryLabel: string;
  emptySignalLabel: string;
  horizon: CommunitySignalFacet;
  evidence: CommunitySignalFacet;
  sourceCount: number;
};

const SOURCE_URL_PATTERN = /https?:\/\/[^\s)\]]+/gi;

function postSearchText(post: PostUI) {
  return `${post.title} ${post.body} ${post.tags.join(" ")}`;
}

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

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function countCommunitySources(post: PostUI) {
  const urls = post.body.match(SOURCE_URL_PATTERN) ?? [];
  return uniqueLabels(urls).length;
}

export function getCommunityTickers(post: PostUI) {
  return uniqueLabels([
    ...post.tags.filter((tag) => tag.startsWith("$")),
    ...detectTickerTags(postSearchText(post)),
  ]);
}

function getCommunityTopicLabels(post: PostUI) {
  const tagTopics = post.tags.filter(
    (tag) => !tag.startsWith("$") && !detectTickerTags(tag).length,
  );
  const suggestedTopics = getSmartTagSuggestions(
    {
      title: post.title,
      body: post.body,
      tags: post.tags,
      imageFile: null,
      imagePreviewUrl: null,
    },
    6,
  )
    .filter((suggestion) => suggestion.kind !== "ticker")
    .map((suggestion) => suggestion.label);

  return uniqueLabels([...tagTopics, ...suggestedTopics]).slice(0, 4);
}

function getPrimarySignalLabel(post: PostUI, topicLabels: string[]) {
  const lower = postSearchText(post).toLowerCase();
  const topics = topicLabels.map((topic) => topic.toLowerCase());

  if (
    topics.includes("question") ||
    /(^|\s)(how|what|should|can|is)\b/.test(lower)
  ) {
    return "Question";
  }
  if (topics.includes("earnings")) return "Earnings watch";
  if (
    topics.includes("news") ||
    hasAny(lower, ["catalyst", "breaking", "announced"])
  ) {
    return "Catalyst watch";
  }
  if (topics.includes("risk") || hasAny(lower, ["downside", "hedge", "risk"])) {
    return "Risk review";
  }
  if (topics.includes("portfolio")) return "Portfolio review";
  if (topics.includes("technical")) return "Technical setup";
  if (topics.includes("fundamental") || topics.includes("analysis")) {
    return "Investment thesis";
  }
  if (topics.includes("strategy")) return "Strategy";
  return getCommunityTickers(post).length
    ? "Ticker discussion"
    : "General discussion";
}

function getHorizonSignal(post: PostUI): CommunitySignalFacet {
  const lower = postSearchText(post).toLowerCase();

  if (hasAny(lower, ["intraday", "today", "this session", "open", "close"])) {
    return { label: "Intraday", tone: "info" };
  }
  if (hasAny(lower, ["swing", "this week", "next week", "weekly"])) {
    return { label: "Swing", tone: "info" };
  }
  if (
    hasAny(lower, [
      "quarter",
      "next quarter",
      "long term",
      "long-term",
      "multi-year",
      "2026",
      "2027",
    ])
  ) {
    return { label: "Long-term", tone: "neutral" };
  }

  return { label: "Unstated", tone: "neutral" };
}

function getEvidenceSignal(
  post: PostUI,
  sourceCount: number,
): CommunitySignalFacet {
  const lower = postSearchText(post).toLowerCase();

  if (sourceCount > 0) return { label: "Source-backed", tone: "positive" };
  if (post.imageUrl) return { label: "Chart attached", tone: "positive" };
  if (
    hasAny(lower, [
      "valuation",
      "backtest",
      "cash flow",
      "margin",
      "revenue",
      "guidance",
    ])
  ) {
    return { label: "Reasoned thesis", tone: "info" };
  }
  if (hasAny(lower, ["risk", "downside", "hedge", "stop loss"])) {
    return { label: "Risk flagged", tone: "warning" };
  }

  return { label: "Opinion", tone: "neutral" };
}

export function getCommunityPostSignals(post: PostUI): CommunityPostSignals {
  const tickers = getCommunityTickers(post);
  const topicLabels = getCommunityTopicLabels(post);
  const sourceCount = countCommunitySources(post);

  return {
    tickers,
    topicLabels,
    primaryLabel: getPrimarySignalLabel(post, topicLabels),
    emptySignalLabel:
      tickers.length || post.tags.length
        ? "Signal detected"
        : "General discussion",
    horizon: getHorizonSignal(post),
    evidence: getEvidenceSignal(post, sourceCount),
    sourceCount,
  };
}

export function getCommunitySignalScore(
  post: PostUI,
  {
    commentCount = post.commentCount,
    now = Date.now(),
  }: { commentCount?: number; now?: number } = {},
) {
  const signals = getCommunityPostSignals(post);
  const ageHours = Math.max(0, (now - post.sortTime) / (1000 * 60 * 60));
  const recencyScore =
    ageHours <= 1 ? 10 : ageHours <= 24 ? 6 : ageHours <= 168 ? 3 : 0;
  const tickerScore = Math.min(signals.tickers.length, 3) * 8;
  const evidenceScore =
    signals.evidence.label === "Reasoned thesis"
      ? 3
      : signals.evidence.label === "Chart attached"
        ? 2
        : 0;
  const primaryScore = signals.primaryLabel === "General discussion" ? 0 : 5;

  return (
    post.votes * 10 +
    commentCount * 4 +
    recencyScore +
    tickerScore +
    evidenceScore +
    primaryScore
  );
}
