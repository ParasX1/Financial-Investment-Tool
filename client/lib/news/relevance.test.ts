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
