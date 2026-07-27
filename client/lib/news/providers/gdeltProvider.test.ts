import { describe, expect, it, jest } from "@jest/globals";
import {
  buildGdeltUrl,
  gdeltProvider,
  isGdeltNewsEnabled,
  mapGdeltArticles,
  parseGdeltSeenDate,
} from "./gdeltProvider";
import type { ServerNewsRequest } from "../types";

const request: ServerNewsRequest = {
  context: "Australia ASX market business economy",
  country: "au",
  kind: "regional",
  marketScopeId: "australia",
  pageSize: "5",
  topicId: "australian-markets",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("gdeltProvider", () => {
  it("is opt-in so an unreliable auxiliary source cannot delay the default feed", () => {
    expect(isGdeltNewsEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(isGdeltNewsEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(
      isGdeltNewsEnabled({
        GDELT_NEWS_ENABLED: "true",
        NODE_ENV: "production",
      }),
    ).toBe(true);
  });

  it("builds GDELT article-list URLs from strict category queries", () => {
    const url = new URL(
      buildGdeltUrl({
        env: { GDELT_NEWS_TIMESPAN: "1d" },
        request,
      }),
    );

    expect(url.origin + url.pathname).toBe(
      "https://api.gdeltproject.org/api/v2/doc/doc",
    );
    expect(url.searchParams.get("mode")).toBe("artlist");
    expect(url.searchParams.get("format")).toBe("json");
    expect(url.searchParams.get("sort")).toBe("datedesc");
    expect(url.searchParams.get("timespan")).toBe("1d");
    expect(url.searchParams.get("query")).toContain("sourcecountry:AS");
    expect(url.searchParams.get("query")).toContain("ASX");
  });

  it("parses compact GDELT seendate values", () => {
    expect(parseGdeltSeenDate("20260616T113000Z")).toBe("2026-06-16T11:30:00Z");
    expect(parseGdeltSeenDate("not-a-date")).toBe("not-a-date");
  });

  it("maps, filters, and dedupes GDELT articles", () => {
    expect(
      mapGdeltArticles([
        {
          domain: "example.com",
          seendate: "20260616T113000Z",
          socialimage: "https://example.com/asx.jpg",
          sourcecountry: "Australia",
          title: "ASX investors watch banks and miners",
          url: "https://example.com/asx",
        },
        {
          domain: "duplicate.com",
          title: "Duplicate URL",
          url: "https://example.com/asx",
        },
        {
          title: "Unsafe URL",
          url: "javascript:alert(1)",
        },
      ]),
    ).toMatchObject([
      {
        id: "https://example.com/asx",
        image: "https://example.com/asx.jpg",
        provider: "gdelt",
        providerLabel: "GDELT",
        publishedAt: "2026-06-16T11:30:00Z",
        source: "example.com",
        title: "ASX investors watch banks and miners",
      },
    ]);
  });

  it("drops unsafe social image URLs without dropping the article", () => {
    expect(
      mapGdeltArticles([
        {
          domain: "example.com",
          socialimage: "javascript:alert(1)",
          title: "ASX investors watch safe story links",
          url: "https://example.com/asx-safe",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        image: null,
        title: "ASX investors watch safe story links",
        url: "https://example.com/asx-safe",
      }),
    ]);
  });

  it("keeps missing GDELT seendates visibly unknown", () => {
    expect(
      mapGdeltArticles([
        {
          domain: "example.com",
          title: "ASX investors watch banks and miners",
          url: "https://example.com/undated-asx",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        publishedAt: "",
        source: "example.com",
        title: "ASX investors watch banks and miners",
      }),
    ]);
  });

  it("fetches and normalizes GDELT JSON responses", async () => {
    const fetcher = jest.fn(async () =>
      jsonResponse({
        articles: [
          {
            domain: "marketdesk.example",
            seendate: "20260616T113000Z",
            title: "ASX market rises as banks lead",
            url: "https://example.com/asx",
          },
        ],
      }),
    ) as unknown as typeof fetch;

    const articles = await gdeltProvider.fetchArticles(request, {
      env: { GDELT_NEWS_ENABLED: "true" },
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("api.gdeltproject.org/api/v2/doc/doc"),
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/json" }),
      }),
    );
    expect(articles[0]?.provider).toBe("gdelt");
  });

  it("returns extra raw candidates before strict relevance trims the page", async () => {
    const fetcher = jest.fn(async () =>
      jsonResponse({
        articles: [
          {
            domain: "example.com",
            title: "ASX market rises as banks lead",
            url: "https://example.com/asx-1",
          },
          {
            domain: "example.com",
            title: "Miners push Australian shares higher",
            url: "https://example.com/asx-2",
          },
          {
            domain: "example.com",
            title: "RBA policy keeps banks in focus",
            url: "https://example.com/asx-3",
          },
        ],
      }),
    ) as unknown as typeof fetch;

    const articles = await gdeltProvider.fetchArticles(
      { ...request, pageSize: "2" },
      {
        env: { GDELT_NEWS_ENABLED: "true" },
        fetcher,
      },
    );

    expect(articles.map((article) => article.id)).toEqual([
      "https://example.com/asx-1",
      "https://example.com/asx-2",
      "https://example.com/asx-3",
    ]);
  });

  it("surfaces GDELT HTTP failures", async () => {
    const fetcher = jest.fn(async () => jsonResponse({}, 429));

    await expect(
      gdeltProvider.fetchArticles(request, {
        env: { GDELT_NEWS_ENABLED: "true" },
        fetcher: fetcher as unknown as typeof fetch,
      }),
    ).rejects.toThrow("GDELT 429");
  });
});
