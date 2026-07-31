import { createHash } from "crypto";
import type { Article } from "@/lib/news/contracts";
import type { ServerNewsRequest, ServerNewsResponse } from "./types";

const CURSOR_VERSION = 1;
const MAX_CURSOR_LENGTH = 768;
const MIN_CURSOR_DATE_MS = Date.UTC(2000, 0, 1);
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_STABLE_KEY_LENGTH = 128;

export type MarketNewsContinuationPosition = {
  publishedAt: string;
  stableKey: string;
};

type CursorPayload = {
  at: string;
  fingerprint: string;
  key: string;
  v: typeof CURSOR_VERSION;
};

export type ContinuableServerNewsResponse = ServerNewsResponse & {
  continuationAnchor?: MarketNewsContinuationPosition | null;
};

function compact(value: string | undefined) {
  return value?.trim() ?? "";
}

function hashRequest(value: string) {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("base64url")
    .slice(0, 22);
}

function requestFingerprint(request: ServerNewsRequest) {
  return hashRequest(
    JSON.stringify({
      commodity: compact(request.commodity),
      context: compact(request.context),
      country: compact(request.country),
      industry: compact(request.industry),
      kind: request.kind,
      marketScopeId: compact(request.marketScopeId),
      query: compact(request.query),
      ticker: compact(request.ticker),
      topicId: compact(request.topicId),
      userSearch: Boolean(request.userSearch),
    }),
  );
}

function normalisePublishedAt(value: string) {
  const time = new Date(value).getTime();

  if (
    !Number.isFinite(time) ||
    time < MIN_CURSOR_DATE_MS ||
    time > Date.now() + MAX_FUTURE_SKEW_MS
  ) {
    return null;
  }

  return new Date(time).toISOString();
}

function isCursorPayload(value: unknown): value is CursorPayload {
  if (!value || typeof value !== "object") return false;

  const payload = value as Partial<CursorPayload>;

  return (
    payload.v === CURSOR_VERSION &&
    typeof payload.at === "string" &&
    typeof payload.key === "string" &&
    payload.key.length > 0 &&
    payload.key.length <= MAX_STABLE_KEY_LENGTH &&
    typeof payload.fingerprint === "string"
  );
}

export function stableMarketNewsArticleKey(article: Article) {
  return createHash("sha256")
    .update(`${article.id}\u0000${article.url}`, "utf8")
    .digest("base64url");
}

export function marketNewsArticlePosition(
  article: Article,
): MarketNewsContinuationPosition | null {
  const publishedAt = normalisePublishedAt(article.publishedAt);
  if (!publishedAt) return null;

  return {
    publishedAt,
    stableKey: stableMarketNewsArticleKey(article),
  };
}

export function compareMarketNewsPositions(
  left: MarketNewsContinuationPosition,
  right: MarketNewsContinuationPosition,
) {
  const timeDifference =
    new Date(right.publishedAt).getTime() -
    new Date(left.publishedAt).getTime();

  return timeDifference || left.stableKey.localeCompare(right.stableKey);
}

export function encodeMarketNewsContinuationCursor(
  request: ServerNewsRequest,
  position: MarketNewsContinuationPosition,
) {
  const publishedAt = normalisePublishedAt(position.publishedAt);
  if (!publishedAt || !position.stableKey.trim()) {
    throw new Error("Cannot encode an invalid market news cursor.");
  }

  const payload: CursorPayload = {
    at: publishedAt,
    fingerprint: requestFingerprint(request),
    key: position.stableKey.slice(0, MAX_STABLE_KEY_LENGTH),
    v: CURSOR_VERSION,
  };

  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeMarketNewsContinuationCursor(
  cursor: string,
  request: ServerNewsRequest,
): MarketNewsContinuationPosition | null {
  if (!cursor || cursor.length > MAX_CURSOR_LENGTH) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as unknown;

    if (
      !isCursorPayload(payload) ||
      payload.fingerprint !== requestFingerprint(request)
    ) {
      return null;
    }

    const publishedAt = normalisePublishedAt(payload.at);
    if (!publishedAt) return null;

    return {
      publishedAt,
      stableKey: payload.key,
    };
  } catch {
    return null;
  }
}

export function filterArticlesPublishedBefore(
  articles: readonly Article[],
  position: MarketNewsContinuationPosition,
) {
  const boundaryTime = new Date(position.publishedAt).getTime();
  if (!Number.isFinite(boundaryTime)) return [];

  return articles.filter((article) => {
    const articlePosition = marketNewsArticlePosition(article);
    if (!articlePosition) return false;

    const articleTime = new Date(articlePosition.publishedAt).getTime();
    return (
      articleTime < boundaryTime ||
      (articleTime === boundaryTime &&
        articlePosition.stableKey.localeCompare(position.stableKey) > 0)
    );
  });
}

export function oldestMarketNewsPosition(
  articles: readonly Article[],
): MarketNewsContinuationPosition | null {
  return (
    articles
      .map(marketNewsArticlePosition)
      .filter(
        (position): position is MarketNewsContinuationPosition =>
          position !== null,
      )
      .sort(compareMarketNewsPositions)
      .at(-1) ?? null
  );
}

export function resolveMarketNewsContinuationRequest(
  request: ServerNewsRequest,
): ServerNewsRequest | null {
  if (!request.continuationCursor) return request;

  const position = decodeMarketNewsContinuationCursor(
    request.continuationCursor,
    request,
  );
  if (!position) return null;

  return {
    ...request,
    publishedBefore: position.publishedAt,
    publishedBeforeKey: position.stableKey,
  };
}

export function withMarketNewsContinuation(
  result: ContinuableServerNewsResponse,
  request: ServerNewsRequest,
): ServerNewsResponse {
  const { continuationAnchor: suppliedAnchor, ...response } = result;
  const anchor =
    suppliedAnchor === undefined
      ? oldestMarketNewsPosition(response.articles)
      : suppliedAnchor;
  const isDemo = response.meta.provider === "demo";
  const hasMore = Boolean(anchor && !isDemo);

  return {
    ...response,
    meta: {
      ...response.meta,
      hasMore,
      nextCursor:
        hasMore && anchor
          ? encodeMarketNewsContinuationCursor(request, anchor)
          : null,
    },
  };
}
