import { describe, expect, it, jest } from "@jest/globals";
import {
  isYahooFinanceRssEnabled,
  mapYahooFinanceRssItems,
  yahooFinanceRssProvider,
} from "./yahooFinanceRssProvider";
import type { ServerNewsRequest } from "../types";

const tickerRequest: ServerNewsRequest = {
  context: "AAPL company stock market news",
  kind: "ticker",
  pageSize: "5",
  ticker: "AAPL",
};

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:media="http://search.yahoo.com/mrss/" version="2.0">
  <channel>
    <item>
      <title>Apple shares rise as investors watch iPhone demand</title>
      <link>https://finance.yahoo.com/news/apple-demand-120000000.html</link>
      <pubDate>Wed, 17 Jun 2026 02:10:00 GMT</pubDate>
      <source url="https://www.reuters.com/">Reuters</source>
      <guid isPermaLink="false">apple-demand-120000000.html</guid>
      <description><![CDATA[Apple demand and services revenue remain in focus.]]></description>
      <media:content url="https://media.example.com/apple.jpg" width="130" height="86" />
    </item>
  </channel>
</rss>`;

describe("yahooFinanceRssProvider", () => {
  it("is enabled by default in every environment and can be disabled explicitly", () => {
    expect(isYahooFinanceRssEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(isYahooFinanceRssEnabled({ NODE_ENV: "production" })).toBe(true);
    expect(
      isYahooFinanceRssEnabled({
        NODE_ENV: "production",
        YAHOO_FINANCE_RSS_ENABLED: "false",
      }),
    ).toBe(false);
    expect(
      isYahooFinanceRssEnabled({
        NODE_ENV: "development",
        YAHOO_FINANCE_RSS_ENABLED: "false",
      }),
    ).toBe(false);
  });

  it("does not provide broad category fallback behavior", () => {
    expect(yahooFinanceRssProvider.allowBroadFallback).toBeUndefined();
  });

  it("declines historical continuation requests it cannot satisfy", () => {
    expect(yahooFinanceRssProvider.supports?.(tickerRequest)).toBe(true);
    expect(
      yahooFinanceRssProvider.supports?.({
        ...tickerRequest,
        publishedBefore: "2026-07-20T12:34:56.000Z",
        publishedBeforeKey: "story-72",
      }),
    ).toBe(false);
  });

  it("maps RSS items into safe original-link article metadata", () => {
    const [article] = mapYahooFinanceRssItems([
        {
          description: "Apple demand and services revenue remain in focus.",
          guid: "apple-demand-120000000.html",
          link: "https://finance.yahoo.com/news/apple-demand-120000000.html",
          "media:content": { "@_url": "https://media.example.com/apple.jpg" },
          pubDate: "Wed, 17 Jun 2026 02:10:00 GMT",
          source: { "#text": "Reuters", "@_url": "https://www.reuters.com/" },
          title: "Apple shares rise as investors watch iPhone demand",
        },
        {
          link: "javascript:alert(1)",
          title: "Unsafe link is dropped",
        },
      ]);

    expect([article]).toMatchObject([
      {
        id: "apple-demand-120000000.html",
        image: "https://media.example.com/apple.jpg",
        provider: "yahoo-finance-rss",
        providerLabel: "Yahoo Finance RSS",
        relatedSymbols: ["AAPL"],
        source: "Reuters",
        title: "Apple shares rise as investors watch iPhone demand",
        url: "https://finance.yahoo.com/news/apple-demand-120000000.html",
      },
    ]);
    expect(article).not.toHaveProperty("confidence");
    expect(article).not.toHaveProperty("sentiment");
  });

  it("drops unsafe RSS media URLs without dropping the story", () => {
    expect(
      mapYahooFinanceRssItems([
        {
          link: "https://finance.yahoo.com/news/safe-story.html",
          "media:content": { "@_url": "javascript:alert(1)" },
          "media:thumbnail": { "@_url": "file:///etc/passwd" },
          title: "Safe Yahoo story with unsafe media",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        image: null,
        title: "Safe Yahoo story with unsafe media",
        url: "https://finance.yahoo.com/news/safe-story.html",
      }),
    ]);
  });

  it("uses Yahoo's ticker RSS endpoint for ticker requests and respects page size", async () => {
    const itemXml = rss.match(/<item>[\s\S]*<\/item>/)?.[0] ?? "";
    const doubleRss = rss.replace("</channel>", `${itemXml}</channel>`);
    const fetcher = jest.fn(async () => new Response(doubleRss));

    const articles = await yahooFinanceRssProvider.fetchArticles(
      { ...tickerRequest, pageSize: "1" },
      {
        env: {
          NODE_ENV: "development",
          YAHOO_FINANCE_RSS_URL: "https://example.test/rssindex.xml",
        },
        fetcher: fetcher as typeof fetch,
      },
    );

    expect(fetcher).toHaveBeenCalledWith(
      "https://finance.yahoo.com/rss/headline?s=AAPL",
      expect.any(Object),
    );
    expect(articles).toHaveLength(1);
    expect(articles[0]?.url).toContain("finance.yahoo.com/news/");
  });

  it("uses Yahoo Finance Australia RSS for non-ticker development feeds", async () => {
    const fetcher = jest.fn(async () => new Response(rss));

    await yahooFinanceRssProvider.fetchArticles(
      {
        context: "Australian personal finance money news",
        kind: "search",
        pageSize: "5",
        query: "Australia money news banking tax superannuation savings",
        topicId: "money-news",
      },
      {
        env: {
          NODE_ENV: "development",
        },
        fetcher: fetcher as typeof fetch,
      },
    );

    expect(fetcher).toHaveBeenCalledWith(
      "https://au.finance.yahoo.com/news/rssindex",
      expect.any(Object),
    );
  });

  it.each([
    "http://127.0.0.1/internal",
    "https://finance.yahoo.com.evil.example/rss",
    "file:///etc/passwd",
  ])("does not fetch an unsafe RSS override: %s", async (configuredUrl) => {
    const fetcher = jest.fn(async () => new Response(rss));

    await yahooFinanceRssProvider.fetchArticles(
      {
        context: "Australian personal finance money news",
        kind: "search",
        pageSize: "5",
        query: "Australia money news banking tax superannuation savings",
        topicId: "money-news",
      },
      {
        env: {
          NODE_ENV: "production",
          YAHOO_FINANCE_RSS_URL: configuredUrl,
        },
        fetcher: fetcher as typeof fetch,
      },
    );

    expect(fetcher).toHaveBeenCalledWith(
      "https://au.finance.yahoo.com/news/rssindex",
      expect.any(Object),
    );
  });
  it("keeps invalid provider dates visibly uncertain instead of rewriting them to now", () => {
    expect(
      mapYahooFinanceRssItems([
        {
          link: "https://finance.yahoo.com/news/date-risk.html",
          pubDate: "not-a-date",
          title: "Malformed RSS dates should not look current",
        },
      ])[0]?.publishedAt,
    ).toBe("not-a-date");
  });
});
