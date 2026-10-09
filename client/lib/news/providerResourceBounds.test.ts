import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { fetchMarketNewsWithProviders } from "./newsService";
import { yahooFinanceRssProvider } from "./providers/yahooFinanceRssProvider";
import { gdeltProvider } from "./providers/gdeltProvider";
import { resolveMarketNewsMarketScope } from "./tickerStrip";
import { buildMarketNewsTickerStripSnapshot } from "./tickerStrip/snapshotService";
import type { Article } from "./contracts";
import type { NewsProvider, ServerNewsRequest } from "./types";

const request: ServerNewsRequest = {
  context: "Apple company stock news",
  kind: "ticker",
  pageSize: "5",
  ticker: "AAPL",
};
const article: Article = {
  id: "apple-earnings",
  image: null,
  publishedAt: "2026-10-08T12:00:00.000Z",
  source: "Reuters",
  summary: "Apple earnings and iPhone demand are in focus.",
  title: "Apple shares rise on earnings",
  url: "https://example.com/apple-earnings",
};
const rss = `<rss version="2.0"><channel><item>
  <title>${article.title}</title><link>${article.url}</link>
  <pubDate>Thu, 08 Oct 2026 12:00:00 GMT</pubDate>
  <source>Reuters</source><description>${article.summary}</description>
</item></channel></rss>`;

function jsonProvider(id: string, signal?: AbortSignal): NewsProvider {
  return {
    id,
    label: id,
    isConfigured: () => true,
    async fetchArticles(_, { fetcher }) {
      const response = await fetcher(`https://example.com/${id}`, { signal });
      const json = (await response.json()) as { articles: Article[] };
      return json.articles;
    },
  };
}

const fallback: NewsProvider = {
  id: "secondary",
  label: "Secondary",
  isConfigured: () => true,
  fetchArticles: async () => [article],
};

function observe<T>(promise: Promise<T>) {
  const result: { state: string; value?: T; error?: unknown } = {
    state: "pending",
  };
  void promise.then(
    (value) => Object.assign(result, { state: "fulfilled", value }),
    (error) => Object.assign(result, { state: "rejected", error }),
  );
  return result;
}

describe("market news provider resource boundaries", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each(["headers", "body"])(
    "reaches the next provider after stalled %s, even when the fixture ignores abort",
    async (stall) => {
      const cancel = jest.fn(() => undefined);
      const signals: AbortSignal[] = [];
      const fetcher = jest.fn(
        async (_: string | URL | Request, init?: RequestInit) => {
          signals.push(init!.signal!);
          if (stall === "headers")
            return new Promise<Response>(() => undefined);
          return new Response(new ReadableStream({ cancel }));
        },
      );
      const result = observe(
        fetchMarketNewsWithProviders(request, {
          env: { NEWS_PROVIDER_TIMEOUT_MS: "50" },
          fetcher,
          providers: [jsonProvider("primary"), fallback],
        }),
      );
      await jest.advanceTimersByTimeAsync(51);
      expect(result.state).toBe("fulfilled");
      expect(result.value?.meta.attemptedProviders).toEqual([
        "primary",
        "secondary",
      ]);
      expect(result.value?.articles).toEqual([article]);
      expect(signals[0]?.aborted).toBe(true);
      if (stall === "body") expect(cancel).toHaveBeenCalledTimes(1);
    },
  );

  it.each([false, true])(
    "rejects oversized decoded JSON before mapping articles (declared length: %s)",
    async (declaredLength) => {
      const body = JSON.stringify({
        articles: [article],
        padding: "x".repeat(2 * 1024 * 1024),
      });
      const fetcher = jest.fn(
        async () =>
          new Response(body, {
            headers: declaredLength
              ? { "Content-Length": String(body.length) }
              : {},
          }),
      );
      const response = await fetchMarketNewsWithProviders(request, {
        env: {},
        fetcher,
        providers: [jsonProvider("primary"), fallback],
      });
      expect(response.meta.provider).toBe("secondary");
      expect(response.meta.warnings).toEqual([
        "primary: temporarily unavailable.",
      ]);
      expect(response.articles).toEqual([article]);
    },
  );

  it("preserves caller cancellation through the boundary and continues with fallback", async () => {
    const caller = new AbortController();
    const cancel = jest.fn(() => undefined);
    const signals: AbortSignal[] = [];
    const result = observe(
      fetchMarketNewsWithProviders(request, {
        env: {},
        fetcher: async (_, init) => {
          signals.push(init!.signal!);
          return new Response(new ReadableStream({ cancel }));
        },
        providers: [jsonProvider("primary", caller.signal), fallback],
      }),
    );
    await jest.advanceTimersByTimeAsync(1);
    caller.abort();
    await jest.advanceTimersByTimeAsync(1);
    expect(result.state).toBe("fulfilled");
    expect(result.value?.meta.provider).toBe("secondary");
    expect(signals[0]?.aborted).toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("shares eight active provider reads across concurrent news and ticker snapshots", async () => {
    const fetcher = jest.fn(async () => new Promise<Response>(() => undefined));
    const news = Array.from({ length: 8 }, () =>
      fetchMarketNewsWithProviders(request, {
        env: {},
        fetcher,
        providers: [jsonProvider("primary")],
      }),
    );
    const ticker = Array.from({ length: 8 }, () =>
      buildMarketNewsTickerStripSnapshot({
        fetcher,
        marketScope: resolveMarketNewsMarketScope("australia"),
      }),
    );
    await jest.advanceTimersByTimeAsync(1);
    const started = fetcher.mock.calls.length;
    const result = observe(Promise.all([...news, ...ticker]));
    await jest.advanceTimersByTimeAsync(16_000);
    expect(started).toBe(8);
    expect(result.state).toBe("fulfilled");
  });

  it("allows valid RSS through the real Yahoo news provider", async () => {
    const response = await fetchMarketNewsWithProviders(request, {
      env: {},
      fetcher: async () => new Response(rss),
      providers: [yahooFinanceRssProvider],
    });
    expect(response.meta.provider).toBe("yahoo-finance-rss");
    expect(response.articles).toHaveLength(1);
    expect(response.articles[0]?.title).toBe(article.title);
    expect(response.meta.warnings).toEqual([]);
  });

  it.each([
    [{ NODE_ENV: "production" }, 8_000],
    [{ NEWS_PROVIDER_TIMEOUT_MS: "120000" }, 8_000],
    [{ NEWS_PROVIDER_TIMEOUT_MS: "invalid" }, 5_000],
  ])(
    "keeps configuration %j within the expected provider budget",
    async (env, budget) => {
      const result = observe(
        fetchMarketNewsWithProviders(request, {
          env,
          fetcher: async () => new Promise<Response>(() => undefined),
          providers: [jsonProvider("primary"), fallback],
        }),
      );
      await jest.advanceTimersByTimeAsync(budget - 1);
      expect(result.state).toBe("pending");
      await jest.advanceTimersByTimeAsync(2);
      expect(result.state).toBe("fulfilled");
      expect(result.value?.meta.provider).toBe("secondary");
    },
  );

  it("allows valid JSON through the real GDELT news provider", async () => {
    const response = await fetchMarketNewsWithProviders(request, {
      env: { GDELT_NEWS_ENABLED: "true" },
      fetcher: async () =>
        new Response(
          JSON.stringify({
            articles: [
              {
                title: article.title,
                url: article.url,
                seendate: "20261008T120000Z",
                domain: "reuters.com",
                language: "English",
              },
            ],
          }),
        ),
      providers: [gdeltProvider],
    });
    expect(response.meta.provider).toBe("gdelt");
    expect(response.articles).toHaveLength(1);
    expect(response.articles[0]?.title).toBe(article.title);
    expect(response.meta.warnings).toEqual([]);
  });
});
