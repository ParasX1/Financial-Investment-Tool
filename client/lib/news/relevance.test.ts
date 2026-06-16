import { describe, expect, it } from "@jest/globals";
import { filterRelevantNewsArticles } from "./relevance";
import type { ServerNewsRequest } from "./types";

const baseArticle = {
  id: "1",
  image: null,
  provider: "marketaux",
  providerLabel: "MarketAux",
  publishedAt: "2026-06-16T04:00:00Z",
  source: "Market Desk",
  summary: "",
  url: "https://example.com/story",
};

describe("filterRelevantNewsArticles", () => {
  it("removes broad finance stories from Cost of Living", () => {
    const request: ServerNewsRequest = {
      context: "Australian household finance cost of living",
      kind: "search",
      pageSize: "18",
      query: "Australia cost of living inflation wages bills interest rates",
      topicId: "cost-of-living",
    };

    expect(
      filterRelevantNewsArticles(
        [
          {
            ...baseArticle,
            id: "broad",
            title: "Weekly Commentary: Bubble Kings",
          },
          {
            ...baseArticle,
            id: "cost",
            summary: "Mortgage pressure and grocery bills remain high.",
            title: "Household budgets stay under pressure",
          },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["cost"]);
  });

  it("requires stronger evidence for Cost of Living than one broad keyword", () => {
    const request: ServerNewsRequest = {
      context: "Australian household finance cost of living",
      kind: "search",
      pageSize: "18",
      query: "Australia cost of living inflation wages bills interest rates",
      topicId: "cost-of-living",
    };

    expect(
      filterRelevantNewsArticles(
        [
          {
            ...baseArticle,
            id: "sector",
            summary:
              "Healthcare stocks position for sector rotation amid inflation and volatility.",
            title: "Five new stocks for the healthcare sector rotation",
          },
          {
            ...baseArticle,
            id: "household",
            summary: "Mortgage stress keeps grocery bills in focus.",
            title: "Household budgets stay under pressure",
          },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["household"]);
  });

  it("keeps title-only Cost of Living stories with strong household phrases", () => {
    const request: ServerNewsRequest = {
      context: "Australian household finance cost of living",
      kind: "search",
      pageSize: "18",
      query: "Australia cost of living inflation wages bills interest rates",
      topicId: "cost-of-living",
    };

    expect(
      filterRelevantNewsArticles(
        [
          {
            ...baseArticle,
            id: "mortgage-stress",
            provider: "google-news-rss",
            title:
              "Mortgage stress deepens as families spend half their income on housing",
          },
          {
            ...baseArticle,
            id: "sector",
            title: "Healthcare stocks position for sector rotation amid inflation",
          },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["mortgage-stress"]);
  });

  it("keeps Cost of Living stories that use common plural market wording", () => {
    const request: ServerNewsRequest = {
      context: "Australian household finance cost of living",
      kind: "search",
      pageSize: "18",
      query: "Australia cost of living inflation wages bills interest rates",
      topicId: "cost-of-living",
    };

    expect(
      filterRelevantNewsArticles(
        [
          {
            ...baseArticle,
            id: "rates",
            title:
              "US inflation jumps as mortgage rates and grocery prices stay high",
          },
          {
            ...baseArticle,
            id: "rents",
            title:
              "Rents climb again as housing affordability worsens for families",
          },
          {
            ...baseArticle,
            id: "not-enough",
            title: "Healthcare shares rise despite inflation concerns",
          },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["rates", "rents"]);
  });

  it("does not treat source names as category evidence", () => {
    const request: ServerNewsRequest = {
      context: "money banking tax superannuation savings",
      kind: "search",
      pageSize: "18",
      query: "money banking tax superannuation savings",
      topicId: "money-news",
    };

    expect(
      filterRelevantNewsArticles(
        [
          {
            ...baseArticle,
            id: "source-only",
            source: "Yahoo Finance",
            title: "Technology earnings update",
          },
          {
            ...baseArticle,
            id: "money",
            summary: "Tax changes affect superannuation savings.",
            source: "Market Desk",
            title: "Investors review retirement settings",
          },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["money"]);
  });

  it("keeps practical Money News headlines with ATO, tax, banks, and mortgage signals", () => {
    const request: ServerNewsRequest = {
      context: "Australian personal finance money news",
      kind: "search",
      pageSize: "18",
      query: "Australia money news banking tax superannuation savings",
      topicId: "money-news",
    };

    expect(
      filterRelevantNewsArticles(
        [
          {
            ...baseArticle,
            id: "ato-tax",
            title: "ATO warning over $528 tax liability for Australian savers",
          },
          {
            ...baseArticle,
            id: "bank-rates",
            title: "Major bank cuts mortgage rates for Australian borrowers",
          },
          {
            ...baseArticle,
            id: "tech",
            title: "Nvidia shares rally as AI spending accelerates",
          },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["ato-tax", "bank-rates"]);
  });

  it("keeps international market stories using common US market language", () => {
    const request: ServerNewsRequest = {
      context: "global markets Wall Street stocks bonds",
      kind: "search",
      marketScopeId: "us-markets",
      pageSize: "12",
      query: "global markets Wall Street stocks bonds",
      topicId: "international-markets",
    };

    expect(
      filterRelevantNewsArticles(
        [
          {
            ...baseArticle,
            id: "us-indexes",
            title:
              "S&P 500 and Nasdaq hit record highs as Wall Street rallies",
          },
          {
            ...baseArticle,
            id: "yields",
            title: "Bond yields rise as Federal Reserve outlook shifts",
          },
          {
            ...baseArticle,
            id: "local-company",
            title: "NVR stock underperforms its sector after earnings",
          },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["us-indexes", "yields"]);
  });

  it("keeps ticker results scoped to the requested symbol", () => {
    const request: ServerNewsRequest = {
      context: "CBA.AX company stock market news",
      kind: "ticker",
      pageSize: "18",
      ticker: "CBA.AX",
    };

    expect(
      filterRelevantNewsArticles(
        [
          {
            ...baseArticle,
            id: "anz",
            relatedSymbols: ["CBA.AX"],
            title: "Are ANZ shares good value?",
          },
          {
            ...baseArticle,
            id: "cba",
            relatedSymbols: ["CBA.AX"],
            title: "Commonwealth Bank shares move higher",
          },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["cba"]);
  });

  it("keeps commodity stories that match commodity market language", () => {
    const request: ServerNewsRequest = {
      commodity: "commodities",
      context: "commodity markets energy metals agriculture",
      kind: "commodity",
      pageSize: "18",
      topicId: "commodities",
    };

    expect(
      filterRelevantNewsArticles(
        [
          {
            ...baseArticle,
            id: "commodity",
            title:
              "Dual momentum in commodities improves risk-adjusted returns",
          },
          { ...baseArticle, id: "unrelated", title: "Small caps weekly wrap" },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["commodity"]);
  });

  it("does not treat broad equity futures headlines as commodities", () => {
    const request: ServerNewsRequest = {
      commodity: "commodities",
      context: "commodity markets energy metals agriculture",
      kind: "commodity",
      pageSize: "18",
      topicId: "commodities",
    };

    expect(
      filterRelevantNewsArticles(
        [
          {
            ...baseArticle,
            id: "equity-futures",
            title:
              "Futures slide amid renewed tech selling before key CPI print",
          },
          {
            ...baseArticle,
            id: "gold",
            title: "Gold rises as commodity traders reduce risk",
          },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["gold"]);
  });
});
