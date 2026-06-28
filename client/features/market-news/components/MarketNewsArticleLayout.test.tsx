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

function articleWithoutImage(index: number): Article {
  return {
    ...article(index),
    image: "",
    providerLabel: "Google News RSS",
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
        feedStatus="1-12 shown"
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
    expect(html).toContain("Topic stories");
    expect(html).toContain("1-12 shown");
    expect(html).toContain("Page 1");
    expect(html).toContain("Next page");
    expect(html).not.toContain("Featured stories");
    expect(html).not.toContain("Latest");
  });

  it("surfaces provider warnings above the topic feed", () => {
    const html = renderToStaticMarkup(
      <MarketNewsArticleLayout
        articles={[article(1)]}
        emptyState={{
          message: "No stories",
          title: "Empty",
        }}
        error={null}
        loading={false}
        providerWarning="Demo stories are synthetic placeholders."
        title="Cost of Living"
      />,
    );

    expect(html).toContain("Demo stories are synthetic placeholders.");
  });

  it("keeps loaded stories visible when a refresh warning is present", () => {
    const html = renderToStaticMarkup(
      <MarketNewsArticleLayout
        articles={[article(1)]}
        emptyState={{
          message: "No stories",
          title: "Empty",
        }}
        error="Market news could not be loaded right now."
        loading={false}
        providerWarning="Could not refresh live market news. Showing the last loaded stories."
        title="Cost of Living"
      />,
    );

    expect(html).toContain("Story 1");
    expect(html).toContain("Could not refresh live market news");
    expect(html).not.toContain("Failed to load Cost of Living");
  });

  it("keeps no-image topic rows text-first instead of repeating fallback art", () => {
    const html = renderToStaticMarkup(
      <MarketNewsArticleLayout
        articles={[articleWithoutImage(1)]}
        emptyState={{
          message: "No stories",
          title: "Empty",
        }}
        error={null}
        loading={false}
        title="Cost of Living"
      />,
    );

    expect(html).toContain("Story 1");
    expect(html).toContain("Google News RSS");
    expect(html).not.toContain("Market News</span>");
  });

  it("labels article signals in beginner-readable language", () => {
    const html = renderToStaticMarkup(
      <MarketNewsArticleLayout
        articles={[
          {
            ...article(1),
            confidence: 0.62,
            image: "",
            relatedSymbols: ["NVDA"],
            sentiment: "neutral",
            summary: "AI and semiconductor demand lifted technology stocks.",
            title: "NVIDIA data-center revenue jumps",
          },
        ]}
        emptyState={{
          message: "No stories",
          title: "Empty",
        }}
        error={null}
        loading={false}
        title="Technology"
      />,
    );

    expect(html).toContain("Google News RSS");
    expect(html).toContain("NVDA");
    expect(html).toContain("Ticker linked");
    expect(html).toContain("Technology");
    expect(html).toContain("Relevance 0.6");
    expect(html).not.toContain("Open original");
    expect(html).not.toContain("Match 0.6");
  });

  it("uses the compact topic feed as the only Market News article layout", () => {
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

    expect(html).toContain("Topic stories");
    expect(html).not.toContain("Featured stories");
    expect(html).not.toContain("Latest");
  });
});
