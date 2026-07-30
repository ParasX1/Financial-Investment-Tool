import type { Article } from "@/services/news";
import {
  decodeMarketNewsContinuationCursor,
  encodeMarketNewsContinuationCursor,
  filterArticlesPublishedBefore,
  marketNewsArticlePosition,
  withMarketNewsContinuation,
} from "./newsContinuation";
import type { ServerNewsRequest, ServerNewsResponse } from "./types";

function article(id: string, publishedAt: string): Article {
  return {
    id,
    image: null,
    publishedAt,
    source: "Market Desk",
    summary: "Household budgets remain under pressure.",
    title: `Cost of living story ${id}`,
    url: `https://example.com/${id}`,
  };
}

const request: ServerNewsRequest = {
  context: "Australian household finance cost of living",
  kind: "search",
  pageSize: "72",
  query: "Australia cost of living inflation wages bills interest rates",
  topicId: "cost-of-living",
};

function response(articles: Article[]): ServerNewsResponse {
  return {
    articles,
    meta: {
      attemptedProviders: ["google-news-rss"],
      provider: "google-news-rss",
      providerLabel: "Google News RSS",
      query: "cost of living",
      strictCategory: true,
      warnings: [],
    },
  };
}

describe("market news continuation", () => {
  it("round-trips a versioned opaque cursor", () => {
    const position = {
      publishedAt: "2026-06-21T04:00:00.000Z",
      stableKey: "story-72\u0000https://example.com/story-72",
    };
    const cursor = encodeMarketNewsContinuationCursor(request, position);

    expect(cursor).not.toContain(position.publishedAt);
    expect(decodeMarketNewsContinuationCursor(cursor, request)).toEqual(
      position,
    );
    expect(
      decodeMarketNewsContinuationCursor(cursor, {
        ...request,
        topicId: "money",
      }),
    ).toBeNull();
  });

  it("keeps cursors bounded when a provider returns very long identifiers", () => {
    const longArticle = article(
      `provider-${"x".repeat(700)}`,
      "2026-06-21T04:00:00.000Z",
    );
    longArticle.url = `https://news.example.com/${"y".repeat(700)}`;
    const position = marketNewsArticlePosition(longArticle);

    expect(position).not.toBeNull();
    const cursor = encodeMarketNewsContinuationCursor(request, position!);

    expect(cursor.length).toBeLessThanOrEqual(768);
    expect(decodeMarketNewsContinuationCursor(cursor, request)).toEqual(
      position,
    );
  });

  it.each([
    "",
    "not-base64",
    Buffer.from(JSON.stringify({ v: 2 })).toString("base64url"),
    Buffer.from(JSON.stringify({ v: 1, at: "not-a-date" })).toString(
      "base64url",
    ),
  ])("rejects invalid cursor %s", (cursor) => {
    expect(decodeMarketNewsContinuationCursor(cursor, request)).toBeNull();
  });

  it("uses a timestamp and stable-key boundary without skipping equal-time stories", () => {
    const position = {
      publishedAt: "2026-06-21T04:00:00.000Z",
      stableKey: "m\u0000https://example.com/m",
    };

    expect(
      filterArticlesPublishedBefore(
        [
          article("newer", "2026-06-22T04:00:00.000Z"),
          article("a", position.publishedAt),
          article("z", position.publishedAt),
          article("older", "2026-06-20T04:00:00.000Z"),
          article("undated", "unknown"),
        ],
        position,
      ).map((item) => item.id),
    ).toEqual(["z", "older"]);
  });

  it("returns an opaque next cursor from the oldest live story", () => {
    const result = withMarketNewsContinuation(
      response([
        article("newer", "2026-06-21T04:00:00.000Z"),
        article("older", "2026-06-20T04:00:00.000Z"),
      ]),
      request,
    );

    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.nextCursor).not.toBeNull();
    expect(
      decodeMarketNewsContinuationCursor(result.meta.nextCursor ?? "", request),
    ).toEqual(
      expect.objectContaining({
        publishedAt: "2026-06-20T04:00:00.000Z",
      }),
    );
  });

  it("marks an empty continuation and demo feed as exhausted", () => {
    expect(
      withMarketNewsContinuation(response([]), {
        ...request,
        publishedBefore: "2026-06-21T04:00:00.000Z",
      }).meta,
    ).toMatchObject({ hasMore: false, nextCursor: null });

    expect(
      withMarketNewsContinuation(
        {
          ...response([article("demo", "2026-06-20T04:00:00.000Z")]),
          meta: {
            ...response([]).meta,
            provider: "demo",
            providerLabel: "Demo",
          },
        },
        request,
      ).meta,
    ).toMatchObject({ hasMore: false, nextCursor: null });
  });
});
