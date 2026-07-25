import { describe, expect, it } from "@jest/globals";
import { filterRelevantNewsArticles } from "./relevance";
import type { ServerNewsRequest } from "./types";

const baseArticle = {
  id: "1",
  image: null,
  provider: "google-news-rss",
  providerLabel: "Google News RSS",
  publishedAt: "2026-06-16T04:00:00Z",
  source: "Yahoo Finance Australia",
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
            title:
              "Healthcare stocks position for sector rotation amid inflation",
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

  it("keeps fresh Cost of Living headlines written in rate-hike shorthand", () => {
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
            id: "rate-hike",
            provider: "yahoo-finance-rss",
            title: "Key group smashed by RBA rate hike",
          },
          {
            ...baseArticle,
            id: "food-inflation",
            title: "Oil and milk prices to spill the tea on inflation story",
          },
          {
            ...baseArticle,
            id: "broad-rba",
            title: "RBA governor speaks at financial industry dinner",
          },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["rate-hike", "food-inflation"]);
  });

  it("keeps local Cost of Living coverage while filtering unrelated offshore inflation stories", () => {
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
            id: "local-source",
            source: "Yahoo Finance Australia",
            title: "Oil and milk prices to spill the tea on inflation story",
          },
          {
            ...baseArticle,
            id: "offshore-cpi",
            source: "TradingView",
            title:
              "Japan CPI stays muted as subsidies mask building inflation pressure",
          },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["local-source"]);
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
            source: "Yahoo Finance Australia",
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

  it("keeps Money News headlines with a single high-signal personal finance term", () => {
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
            id: "super",
            title:
              "Superannuation secret at the heart of Aussie economy as boomers keep spending",
          },
          {
            ...baseArticle,
            id: "credit-cards",
            title: "June's best rewards credit cards revealed",
          },
          {
            ...baseArticle,
            id: "broad-finance",
            title: "Finance leaders prepare for technology earnings season",
          },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["super", "credit-cards"]);
  });

  it("keeps Money News headlines using Australian tax and property-policy shorthand", () => {
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
            id: "cgt",
            title:
              "Albanese announces capital gains tax exemptions after budget backlash",
          },
          {
            ...baseArticle,
            id: "negative-gearing",
            title: "Australia may regret its war on negative gearing",
          },
          {
            ...baseArticle,
            id: "broad-policy",
            title: "Government policy agenda dominates Question Time",
          },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["cgt", "negative-gearing"]);
  });

  it("filters offshore personal finance stories out of Australian Money News", () => {
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
            id: "local-super",
            source: "The Australian",
            title: "Super's valley of pain meets Labor's CGT trap",
          },
          {
            ...baseArticle,
            id: "offshore-mortgage",
            source: "Novinite.com",
            title:
              "Bulgaria ranks second in Eurozone for lowest mortgage rates",
          },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["local-super"]);
  });

  it("keeps Personal Finance practical without accepting one generic money term", () => {
    const request: ServerNewsRequest = {
      context: "personal finance household money Australia",
      kind: "search",
      pageSize: "18",
      query: "personal finance Australia mortgage retirement insurance savings",
      topicId: "personal-finance",
    };

    expect(
      filterRelevantNewsArticles(
        [
          {
            ...baseArticle,
            id: "mortgage-only",
            title: "Australian lenders expect mortgage demand to rise",
          },
          {
            ...baseArticle,
            id: "household-choice",
            title: "Australians compare mortgage rates and insurance costs",
          },
          {
            ...baseArticle,
            id: "direct-guide",
            title: "Personal finance guide for Australian savers",
          },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["household-choice", "direct-guide"]);
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
            title: "S&P 500 and Nasdaq hit record highs as Wall Street rallies",
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

  it("keeps Australian Markets focused on market-moving stories", () => {
    const request: ServerNewsRequest = {
      context: "Australia ASX market business economy",
      country: "au",
      kind: "regional",
      pageSize: "18",
      topicId: "australian-markets",
    };

    expect(
      filterRelevantNewsArticles(
        [
          {
            ...baseArticle,
            id: "asx",
            title: "ASX 200 falls as BHP drags Australian shares lower",
          },
          {
            ...baseArticle,
            id: "weather",
            title: "El Niño: what it means for Australia's climate",
          },
          {
            ...baseArticle,
            id: "diplomacy",
            title: "Strengthening Australia-Japan ties on treaty anniversary",
          },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["asx"]);
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

  it("does not treat non-market copper or energy wording as commodities news", () => {
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
            id: "medicine",
            title: "Copper drug restores memory in early research",
          },
          {
            ...baseArticle,
            id: "energy",
            title: "Energy markets jump as oil prices rise",
          },
        ],
        request,
      ).map((article) => article.id),
    ).toEqual(["energy"]);
  });

  it.each([
    {
      expectedId: "top",
      matchingTitle:
        "ASX 200 rises as Australian inflation data changes the market outlook",
      topicId: "top-stories",
    },
    {
      expectedId: "earnings",
      matchingTitle: "CBA earnings beat forecasts as profit and revenue rise",
      topicId: "companies-earnings",
    },
    {
      expectedId: "economy",
      matchingTitle:
        "Australian federal budget shifts the economic growth outlook",
      topicId: "economy-policy",
    },
    {
      expectedId: "rates",
      matchingTitle:
        "RBA interest rate decision keeps inflation outlook in focus",
      topicId: "rates-inflation",
    },
    {
      expectedId: "super",
      matchingTitle:
        "ATO updates superannuation tax rules for Australian workers",
      topicId: "super-tax",
    },
  ])(
    "keeps relevant $topicId coverage while rejecting unrelated lifestyle news",
    ({ expectedId, matchingTitle, topicId }) => {
      const request: ServerNewsRequest = {
        context: topicId,
        kind: "search",
        pageSize: "18",
        query: topicId,
        topicId,
      };

      expect(
        filterRelevantNewsArticles(
          [
            {
              ...baseArticle,
              id: expectedId,
              title: matchingTitle,
            },
            {
              ...baseArticle,
              id: "lifestyle",
              title: "Winter garden trends and the best flowers to plant",
            },
          ],
          request,
        ).map((article) => article.id),
      ).toEqual([expectedId]);
    },
  );
});
