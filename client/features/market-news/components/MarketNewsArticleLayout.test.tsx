import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Article } from "@/services/news";
import { MarketNewsArticleLayout } from "./MarketNewsArticleLayout";

function article(index: number): Article {
  return {
    id: `story-${index}`,
    image: `https://example.com/story-${index}.jpg`,
    provider: "google-news-rss",
    providerLabel: "Google News RSS",
    publishedAt: "2026-06-16T04:00:00Z",
    source: "Yahoo Finance AU",
    summary: "",
    title: `Story ${index}`,
    url: `https://example.com/story-${index}`,
  };
}

describe("MarketNewsArticleLayout", () => {
  it("renders Yahoo-style topic feed rows with pagination controls", () => {
    const html = renderToStaticMarkup(
      <MarketNewsArticleLayout
        articles={Array.from({ length: 12 }, (_, index) => article(index + 1))}
        emptyState={{
          message: "No stories",
          title: "Empty",
        }}
        error={null}
        layout="topicFeed"
        loading={false}
        pagination={{
          hasNextPage: true,
          hasPreviousPage: false,
          loading: false,
          pageIndex: 0,
          pageSize: 12,
          totalLoaded: 13,
          onNextPage: () => undefined,
          onPreviousPage: () => undefined,
        }}
        title="Cost of Living"
      />,
    );

    const articleMarkup = [
      ...html.matchAll(/<article[\s\S]*?<\/article>/g),
    ].map(([markup]) => markup);

    expect(articleMarkup).toHaveLength(12);
    expect(html).toContain("Page 1");
    expect(html).toContain("12 stories shown");
    expect(html).toContain("Next page");
    expect(html).not.toContain("Featured stories");
    expect(html).not.toContain("Latest");
  });

  it("keeps the existing feature layout as the default", () => {
    const html = renderToStaticMarkup(
      <MarketNewsArticleLayout
        articles={Array.from({ length: 5 }, (_, index) => article(index + 1))}
        emptyState={{
          message: "No stories",
          title: "Empty",
        }}
        error={null}
        loading={false}
        title="Markets"
      />,
    );

    expect(html).toContain("Featured stories");
    expect(html).toContain("Latest");
  });
});
