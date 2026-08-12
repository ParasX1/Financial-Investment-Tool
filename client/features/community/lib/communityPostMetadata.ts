// File purpose: Validates explicit, author-selected Community research context.
import type { CommunityPostType, CommunityTimeFrame } from "../types";
import {
  normalizeCommunitySymbol,
  normalizeCommunityTickers,
  parseCommunityTickerInput,
  validateCommunityTickers,
} from "./communityTickers";

export { normalizeCommunitySymbol, normalizeCommunityTickers };

const POST_TYPE_LABELS: Record<CommunityPostType, string> = {
  analysis: "Analysis",
  discussion: "Discussion",
  news: "News discussion",
  portfolio: "Portfolio review",
  question: "Question",
};

const TIME_FRAME_LABELS: Record<CommunityTimeFrame, string> = {
  long: "Long term",
  medium: "Medium term",
  short: "Short term",
};

const COMMUNITY_POST_TYPES = new Set<CommunityPostType>([
  "analysis",
  "discussion",
  "news",
  "portfolio",
  "question",
]);
const COMMUNITY_TIME_FRAMES = new Set<CommunityTimeFrame>([
  "long",
  "medium",
  "short",
]);
const MAX_SOURCE_URL_LENGTH = 2048;

export function normalizeCommunityPostType(value: unknown): CommunityPostType {
  return typeof value === "string" &&
    COMMUNITY_POST_TYPES.has(value as CommunityPostType)
    ? (value as CommunityPostType)
    : "discussion";
}

export function normalizeCommunityTimeFrame(
  value: unknown,
): CommunityTimeFrame | null {
  return typeof value === "string" &&
    COMMUNITY_TIME_FRAMES.has(value as CommunityTimeFrame)
    ? (value as CommunityTimeFrame)
    : null;
}

export function normalizeCommunitySourceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_SOURCE_URL_LENGTH) return null;

  try {
    const url = new URL(normalized);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return normalized;
  } catch {
    return null;
  }
}

export function getCommunityPostTypeLabel(type: CommunityPostType): string {
  return POST_TYPE_LABELS[type];
}

export function getCommunityTimeFrameLabel(
  timeFrame: CommunityTimeFrame | null,
): string | null {
  return timeFrame ? TIME_FRAME_LABELS[timeFrame] : null;
}

export function validateCommunityResearchDraft(input: {
  postType: unknown;
  timeFrame?: unknown;
  tickers?: unknown;
  tickerInput?: unknown;
  symbol?: unknown;
  sourceUrl: unknown;
}): string | null {
  if (
    !input.postType ||
    normalizeCommunityPostType(input.postType) !== input.postType
  ) {
    return "Choose a post type.";
  }
  if (input.timeFrame && !normalizeCommunityTimeFrame(input.timeFrame)) {
    return "Choose a valid time frame or leave it blank.";
  }
  const tickerValues = [
    ...(Array.isArray(input.tickers) ? input.tickers : []),
    ...(typeof input.tickerInput === "string"
      ? input.tickerInput.split(/[\s,]+/).filter(Boolean)
      : typeof input.symbol === "string" && input.symbol.trim()
        ? parseCommunityTickerInput(input.symbol)
        : []),
  ];
  const tickerError = validateCommunityTickers(tickerValues);
  if (tickerError) {
    return tickerError;
  }
  if (typeof input.sourceUrl === "string" && input.sourceUrl.trim()) {
    if (!normalizeCommunitySourceUrl(input.sourceUrl)) {
      return "Enter a valid http or https source URL.";
    }
  }
  return null;
}
