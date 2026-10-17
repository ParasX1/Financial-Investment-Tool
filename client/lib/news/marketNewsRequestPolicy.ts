import { MARKET_NEWS_NAV_GROUPS } from "./catalog";
import type { ServerNewsRequest } from "./types";

const PUBLIC_MARKET_NEWS_CACHE_CONTROL =
  "s-maxage=900, stale-while-revalidate=1800";
const PRIVATE_MARKET_NEWS_CACHE_CONTROL = "private, no-store, max-age=0";

function normalized(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function publicTopicFor(request: ServerNewsRequest) {
  if (!request.topicId) return null;

  const topics = MARKET_NEWS_NAV_GROUPS.flatMap((group) => [...group.topics]);
  const topic = topics.find((item) => item.id === request.topicId);

  return topic ?? null;
}

export function isPublicMarketNewsTopicRequest(request: ServerNewsRequest) {
  const topic = publicTopicFor(request);
  if (!topic || topic.source.kind !== request.kind) return false;

  if (request.kind === "search" && topic.source.kind === "search") {
    return normalized(request.query) === normalized(topic.source.query);
  }

  if (request.kind === "regional" && topic.source.kind === "regional") {
    return normalized(request.country) === normalized(topic.source.country);
  }

  if (request.kind === "industry" && topic.source.kind === "industry") {
    return normalized(request.industry) === normalized(topic.source.industry);
  }

  if (request.kind === "commodity" && topic.source.kind === "commodity") {
    return normalized(request.commodity) === normalized(topic.source.commodity);
  }

  if (request.kind === "general" && topic.source.kind === "general") {
    return normalized(request.context) === normalized(topic.source.context);
  }

  return false;
}

export function applyMarketNewsRequestPrivacy(
  request: ServerNewsRequest,
): ServerNewsRequest {
  const publicTopicRequest = isPublicMarketNewsTopicRequest(request);

  if (request.kind !== "search") {
    return {
      ...request,
      userSearch: false,
    };
  }

  return {
    ...request,
    userSearch: !publicTopicRequest,
  };
}

export function getMarketNewsCacheControl({
  manualRefresh,
  request,
}: {
  manualRefresh: boolean;
  request: ServerNewsRequest;
}) {
  if (manualRefresh || !isPublicMarketNewsTopicRequest(request)) {
    return PRIVATE_MARKET_NEWS_CACHE_CONTROL;
  }

  return PUBLIC_MARKET_NEWS_CACHE_CONTROL;
}
