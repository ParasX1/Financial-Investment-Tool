import { describe, expect, it, jest } from "@jest/globals";
import {
  buildGoogleNewsRssUrl,
  buildGoogleNewsRssUrls,
  googleNewsRssProvider,
  isGoogleNewsRssEnabled,
  mapGoogleNewsRssItems,
} from "./googleNewsRssProvider";
import type { ServerNewsRequest } from "../types";

const request: ServerNewsRequest = {
  context: "Australian household finance cost of living",
  kind: "search",
  pageSize: "2",
  query: "Australia cost of living inflation",
  topicId: "cost-of-living",
};

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:media="http://search.yahoo.com/mrss/" version="2.0">
  <channel>
    <item>
      <title>Mortgage pressure rises as cost of living bites - Yahoo Finance Australia</title>
      <link>https://news.google.com/rss/articles/example?oc=5</link>
      <pubDate>Tue, 16 Jun 2026 00:19:00 GMT</pubDate>
      <source url="https://au.finance.yahoo.com">Yahoo Finance Australia</source>
      <guid isPermaLink="false">example-guid</guid>
      <description><![CDATA[
        <a href="https://news.google.com/rss/articles/example?oc=5">Mortgage pressure rises as cost of living bites</a>&nbsp;&nbsp;<font color="#6f6f6f">Yahoo Finance Australia</font>
      ]]></description>
    </item>
  </channel>
</rss>`;

const multiItemRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>ATO tax warning for Australian savers - Example</title>
      <link>https://news.google.com/rss/articles/ato?oc=5</link>
      <pubDate>Tue, 16 Jun 2026 00:19:00 GMT</pubDate>
      <source>Example</source>
      <guid>ato-guid</guid>
    </item>
    <item>
      <title>Major bank cuts mortgage rates for borrowers - Example</title>
      <link>https://news.google.com/rss/articles/mortgage?oc=5</link>
      <pubDate>Tue, 16 Jun 2026 00:20:00 GMT</pubDate>
      <source>Example</source>
      <guid>mortgage-guid</guid>
    </item>
    <item>
      <title>Superannuation savings changes explained - Example</title>
      <link>https://news.google.com/rss/articles/super?oc=5</link>
      <pubDate>Tue, 16 Jun 2026 00:21:00 GMT</pubDate>
      <source>Example</source>
      <guid>super-guid</guid>
    </item>
  </channel>
</rss>`;

function rssWithItems(items: readonly { guid: string; title: string }[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    ${items
      .map(
        (item) => `<item>
      <title>${item.title}</title>
      <link>https://news.google.com/rss/articles/${item.guid}?oc=5</link>
      <pubDate>Tue, 16 Jun 2026 00:19:00 GMT</pubDate>
      <source>Example</source>
      <guid>${item.guid}</guid>
    </item>`,
      )
      .join("\n")}
  </channel>
</rss>`;
}

describe("googleNewsRssProvider", () => {
  it("is enabled by default outside production and opt-in for production", () => {
    expect(isGoogleNewsRssEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(isGoogleNewsRssEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(
      isGoogleNewsRssEnabled({
        GOOGLE_NEWS_RSS_ENABLED: "true",
        NODE_ENV: "production",
      }),
    ).toBe(true);
  });

  it("builds Google News RSS search URLs from category query packs", () => {
    const url = new URL(buildGoogleNewsRssUrl(request));

    expect(url.origin + url.pathname).toBe(
      "https://news.google.com/rss/search",
    );
    expect(url.searchParams.get("q")).toContain('"cost of living"');
    expect(url.searchParams.get("q")).toContain(" OR ");
    expect(url.searchParams.get("q")).toContain("when:3d");
    expect(url.searchParams.get("hl")).toBe("en-AU");
    expect(url.searchParams.get("gl")).toBe("AU");
    expect(url.searchParams.get("ceid")).toBe("AU:en");
  });

  it("builds multiple RSS URLs so sparse categories can merge results", () => {
    const urls = buildGoogleNewsRssUrls(request).map((value) => new URL(value));

    expect(urls.length).toBeGreaterThan(1);
    expect(
      new Set(urls.map((url) => url.searchParams.get("q"))).size,
    ).toBe(urls.length);
  });

  it("maps RSS items into safe Google News link article metadata", () => {
    expect(
      mapGoogleNewsRssItems([
        {
          description:
            "Mortgage pressure rises as cost of living bites - Yahoo Finance Australia",
          guid: "example-guid",
          link: "https://news.google.com/rss/articles/example?oc=5",
          pubDate: "Tue, 16 Jun 2026 00:19:00 GMT",
          source: {
            "#text": "Yahoo Finance Australia",
            "@_url": "https://au.finance.yahoo.com",
          },
          title:
            "Mortgage pressure rises as cost of living bites - Yahoo Finance Australia",
        },
        {
          link: "javascript:alert(1)",
          title: "Unsafe URL",
        },
      ]),
    ).toMatchObject([
      {
        id: "example-guid",
        provider: "google-news-rss",
        providerLabel: "Google News RSS",
        source: "Yahoo Finance Australia",
        summary: "",
        title:
          "Mortgage pressure rises as cost of living bites - Yahoo Finance Australia",
        url: "https://news.google.com/rss/articles/example?oc=5",
      },
    ]);
  });

  it("fetches and parses Google News RSS responses", async () => {
    const fetcher = jest.fn(async () => new Response(rss));

    const articles = await googleNewsRssProvider.fetchArticles(request, {
      env: { GOOGLE_NEWS_RSS_ENABLED: "true" },
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("news.google.com/rss/search"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: expect.stringContaining("application/rss+xml"),
        }),
      }),
    );
    expect(fetcher.mock.calls.length).toBeGreaterThan(1);
    expect(articles).toHaveLength(1);
    expect(articles[0]?.provider).toBe("google-news-rss");
  });

  it("returns extra raw candidates so strict relevance can filter before page slicing", async () => {
    const fetcher = jest.fn(async () => new Response(multiItemRss));

    const articles = await googleNewsRssProvider.fetchArticles(request, {
      env: { GOOGLE_NEWS_RSS_ENABLED: "true" },
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(articles.map((article) => article.id)).toEqual([
      "ato-guid",
      "mortgage-guid",
      "super-guid",
    ]);
  });

  it("interleaves query variants so one broad RSS query cannot crowd out targeted candidates", async () => {
    let callIndex = 0;
    const broadRss = rssWithItems(
      Array.from({ length: 10 }, (_, index) => ({
        guid: `broad-${index}`,
        title: `General finance headline ${index} - Example`,
      })),
    );
    const targetedRss = rssWithItems([
      {
        guid: "targeted-tax",
        title: "ATO tax return warning for Australian savers - Example",
      },
    ]);
    const fetcher = jest.fn(async () => {
      const response = callIndex === 0 ? broadRss : targetedRss;
      callIndex += 1;
      return new Response(response);
    });

    const articles = await googleNewsRssProvider.fetchArticles(request, {
      env: { GOOGLE_NEWS_RSS_ENABLED: "true" },
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(articles.map((article) => article.id)).toContain("targeted-tax");
    expect(articles.findIndex((article) => article.id === "targeted-tax")).toBe(
      1,
    );
  });

  it("surfaces Google News RSS HTTP failures when every candidate fails", async () => {
    const fetcher = jest.fn(async () => new Response("", { status: 429 }));

    await expect(
      googleNewsRssProvider.fetchArticles(request, {
        env: { GOOGLE_NEWS_RSS_ENABLED: "true" },
        fetcher: fetcher as unknown as typeof fetch,
      }),
    ).rejects.toThrow("Google News RSS 429");
  });
});
