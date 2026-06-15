import { describe, expect, it, jest, afterEach } from "@jest/globals";
import {
  buildNewsSearchQueries,
  fetchNewsApiArticles,
  normaliseNewsApiPageSize,
} from "./newsApi";

afterEach(() => {
  jest.restoreAllMocks();
});

describe("newsApi helpers", () => {
  it("keeps the direct query broad before trying contextual fallbacks", () => {
    expect(
      buildNewsSearchQueries({
        context: "Australia ASX market business economy",
        fallback: "finance markets business economy",
        query: "RBA rates",
      }),
    ).toEqual([
      "RBA rates",
      "RBA rates Australia",
      "Australia ASX market business economy",
      "finance markets business economy",
    ]);
  });

  it("bounds page size values accepted by the API proxy", () => {
    expect(normaliseNewsApiPageSize("0")).toBe("1");
    expect(normaliseNewsApiPageSize("18")).toBe("18");
    expect(normaliseNewsApiPageSize("500")).toBe("100");
    expect(normaliseNewsApiPageSize("not-a-number")).toBe("10");
  });

  it("falls back to later NewsAPI candidates when a narrow query returns no stories", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          articles: [
            {
              description: "Fallback summary",
              publishedAt: "2026-06-15T10:00:00Z",
              source: { name: "Market Desk" },
              title: "Fallback market story",
              url: "https://example.com/story",
              urlToImage: "https://example.com/story.jpg",
            },
          ],
        }),
      } as Response);

    const articles = await fetchNewsApiArticles({
      apiKey: "test-key",
      candidates: [
        { endpoint: "everything", params: { q: "too narrow" } },
        { endpoint: "top-headlines", params: { category: "business" } },
      ],
      pageSize: "10",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(articles).toEqual([
      {
        id: "https://example.com/story",
        image: "https://example.com/story.jpg",
        publishedAt: "2026-06-15T10:00:00Z",
        source: "Market Desk",
        summary: "Fallback summary",
        title: "Fallback market story",
        url: "https://example.com/story",
      },
    ]);
  });

  it("continues through fallback candidates when early results do not fill the requested page", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          articles: [
            {
              description: "Narrow summary",
              publishedAt: "2026-06-15T09:00:00Z",
              source: { name: "Local Market Desk" },
              title: "Narrow market story",
              url: "https://example.com/narrow",
              urlToImage: null,
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          articles: [
            {
              description: "Broader summary",
              publishedAt: "2026-06-15T10:00:00Z",
              source: { name: "Global Market Desk" },
              title: "Broader market story",
              url: "https://example.com/broader",
              urlToImage: null,
            },
          ],
        }),
      } as Response);

    const articles = await fetchNewsApiArticles({
      apiKey: "test-key",
      candidates: [
        { endpoint: "everything", params: { q: "narrow" } },
        { endpoint: "everything", params: { q: "broader" } },
      ],
      pageSize: "2",
    });

    expect(articles.map((article) => article.title)).toEqual([
      "Narrow market story",
      "Broader market story",
    ]);
  });
});
