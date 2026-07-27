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
          canLoadOlder: true,
          hasNextPage: true,
          hasPreviousPage: false,
          loading: false,
          loadingOlder: false,
          olderError: null,
          pageIndex: 0,
          pageSize: 12,
          reachedEnd: false,
          totalLoaded: 13,
          onLoadOlder: () => undefined,
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

  it("offers an explicit older-stories action after local pages are exhausted", () => {
    const html = renderToStaticMarkup(
      <MarketNewsArticleLayout
        articles={[article(72)]}
        emptyState={{ message: "No stories", title: "Empty" }}
        error={null}
        loading={false}
        pagination={{
          canLoadOlder: true,
          hasNextPage: false,
          hasPreviousPage: true,
          loading: false,
          loadingOlder: false,
          olderError: null,
          pageIndex: 5,
          pageSize: 12,
          reachedEnd: false,
          totalLoaded: 72,
          onLoadOlder: () => undefined,
          onNextPage: () => undefined,
          onPreviousPage: () => undefined,
        }}
        title="Cost of Living"
      />,
    );

    expect(html).toContain("Load older stories");
    expect(html).not.toContain("No older stories");
  });

  it("announces older-story loading and disables duplicate requests", () => {
    const html = renderToStaticMarkup(
      <MarketNewsArticleLayout
        articles={[article(72)]}
        emptyState={{ message: "No stories", title: "Empty" }}
        error={null}
        loading={false}
        pagination={{
          canLoadOlder: true,
          hasNextPage: false,
          hasPreviousPage: true,
          loading: false,
          loadingOlder: true,
          olderError: null,
          pageIndex: 5,
          pageSize: 12,
          reachedEnd: false,
          totalLoaded: 72,
          onLoadOlder: () => undefined,
          onNextPage: () => undefined,
          onPreviousPage: () => undefined,
        }}
        title="Cost of Living"
      />,
    );

    expect(html).toContain("Loading older stories...");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("disabled");
  });

  it("keeps older-story failures retryable without hiding loaded stories", () => {
    const html = renderToStaticMarkup(
      <MarketNewsArticleLayout
        articles={[article(72)]}
        emptyState={{ message: "No stories", title: "Empty" }}
        error={null}
        loading={false}
        pagination={{
          canLoadOlder: true,
          hasNextPage: false,
          hasPreviousPage: true,
          loading: false,
          loadingOlder: false,
          olderError:
            "Older stories could not be loaded. Try again without losing the stories above.",
          pageIndex: 5,
          pageSize: 12,
          reachedEnd: false,
          totalLoaded: 72,
          onLoadOlder: () => undefined,
          onNextPage: () => undefined,
          onPreviousPage: () => undefined,
        }}
        title="Cost of Living"
      />,
    );

    expect(html).toContain("Story 72");
    expect(html).toContain("Older stories could not be loaded");
    expect(html).toContain("Try loading older stories again");
  });

  it("shows an honest provider-history end state", () => {
    const html = renderToStaticMarkup(
      <MarketNewsArticleLayout
        articles={[article(96)]}
        emptyState={{ message: "No stories", title: "Empty" }}
        error={null}
        loading={false}
        pagination={{
          canLoadOlder: false,
          hasNextPage: false,
          hasPreviousPage: true,
          loading: false,
          loadingOlder: false,
          olderError: null,
          pageIndex: 7,
          pageSize: 12,
          reachedEnd: true,
          totalLoaded: 96,
          onLoadOlder: () => undefined,
          onNextPage: () => undefined,
          onPreviousPage: () => undefined,
        }}
        title="Cost of Living"
      />,
    );

    expect(html).toContain("No older stories");
    expect(html).toContain(
      "No more stories are available from the current providers for this topic.",
    );
    expect(html).toContain("disabled");
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

  it("announces that source links open in a new tab", () => {
    const html = renderToStaticMarkup(
      <MarketNewsArticleLayout
        articles={[article(1)]}
        emptyState={{
          message: "No stories",
          title: "Empty",
        }}
        error={null}
        loading={false}
        title="Top Stories"
      />,
    );

    expect(html).toContain(
      'aria-label="Read source article in a new tab: Story 1"',
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
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
