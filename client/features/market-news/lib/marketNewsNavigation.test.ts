import { describe, expect, it } from "@jest/globals";
import {
  MARKET_NEWS_MARKET_SCOPES,
  MARKET_NEWS_NAV_GROUPS,
} from "../data/marketNewsConfig";
import {
  buildMarketNewsRequest,
  defaultMarketNewsMarketScopeId,
  defaultMarketNewsTopicId,
  getMarketNewsGroupForTopic,
  getMarketNewsTopics,
  resolveMarketNewsMarketScope,
  resolveMarketNewsTopic,
} from "./marketNewsNavigation";

describe("marketNewsNavigation", () => {
  it("models the Yahoo Finance AU inspired channel hierarchy", () => {
    expect(MARKET_NEWS_NAV_GROUPS.map((group) => group.label)).toEqual([
      "Cost of Living",
      "Markets",
      "Money",
      "Work",
      "Technology",
    ]);

    expect(
      MARKET_NEWS_NAV_GROUPS.find(
        (group) => group.id === "markets",
      )?.topics.map((topic) => topic.label),
    ).toEqual(["Australian Markets", "International Markets", "Commodities"]);

    expect(
      MARKET_NEWS_NAV_GROUPS.find((group) => group.id === "money")?.topics.map(
        (topic) => topic.label,
      ),
    ).toEqual(["Money News", "Personal Finance", "Property News"]);
  });

  it("uses Cost of Living as the default reader entry point", () => {
    expect(defaultMarketNewsTopicId).toBe("cost-of-living");
    expect(resolveMarketNewsTopic(undefined).id).toBe("cost-of-living");
    expect(resolveMarketNewsTopic("not-a-topic").id).toBe("cost-of-living");
  });

  it("flattens topics and resolves their parent groups", () => {
    const topics = getMarketNewsTopics();

    expect(topics.map((topic) => topic.id)).toContain("international-markets");
    expect(getMarketNewsGroupForTopic("commodities")?.label).toBe("Markets");
    expect(getMarketNewsGroupForTopic("property-news")?.label).toBe("Money");
  });

  it("builds topic requests and lets search override the active topic source", () => {
    const topic = resolveMarketNewsTopic("australian-markets");
    const topicRequest = buildMarketNewsRequest(topic, "");

    expect(topicRequest).toMatchObject({
      kind: "regional",
      country: "au",
      title: "Australian Markets",
    });

    expect(buildMarketNewsRequest(topic, "  RBA rates  ")).toMatchObject({
      kind: "search",
      query: "RBA rates",
      context: topic.source.context,
      title: 'Search results for "RBA rates"',
      userSearch: true,
    });
  });

  it("uses market scope as an article filter when not searching or drilling into a ticker", () => {
    const topic = resolveMarketNewsTopic("cost-of-living");
    const usScope = resolveMarketNewsMarketScope("us-markets");

    const request = buildMarketNewsRequest(topic, "", "", usScope);

    expect(request).toMatchObject({
      kind: "search",
      marketScopeId: "us-markets",
      title: "Cost of Living - US Markets",
      topicId: "cost-of-living",
      userSearch: false,
    });
    expect(request.query).toContain("US Markets");
    expect(request.query).toContain("Australia cost of living");
    expect(request.query).not.toContain("S&P 500");
    expect(request.query).not.toContain("^GSPC");
    expect(request.context).not.toContain("S&P 500");
    expect(request.context).not.toContain("^GSPC");
  });

  it("does not turn the first market ticker into the default news query", () => {
    const topic = resolveMarketNewsTopic("cost-of-living");
    const australiaScope = resolveMarketNewsMarketScope("australia");

    const request = buildMarketNewsRequest(topic, "", "", australiaScope);

    expect(request).toMatchObject({
      kind: "search",
      marketScopeId: "australia",
      title: "Cost of Living",
      topicId: "cost-of-living",
    });
    expect(request.ticker).toBeUndefined();
    expect(request.query).toContain("Australia cost of living");
    expect(request.query).not.toContain("ALL ORDS");
    expect(request.query).not.toContain("^AORD");
    expect(request.query).not.toContain("AUD/USD");
    expect(request.query).not.toContain("CL=F");
    expect(request.context).not.toContain("ALL ORDS");
    expect(request.context).not.toContain("^AORD");
  });

  it("keeps ticker drill-down stronger than the active market scope", () => {
    const topic = resolveMarketNewsTopic("cost-of-living");
    const usScope = resolveMarketNewsMarketScope("us-markets");

    expect(buildMarketNewsRequest(topic, "", "cba.ax", usScope)).toMatchObject({
      kind: "ticker",
      marketScopeId: "us-markets",
      ticker: "CBA.AX",
      title: "CBA.AX News",
    });
  });

  it("distinguishes topic search sources from user-submitted searches", () => {
    const topic = resolveMarketNewsTopic("cost-of-living");

    expect(buildMarketNewsRequest(topic, "")).toMatchObject({
      kind: "search",
      query: "Australia cost of living inflation wages bills interest rates",
      title: "Cost of Living",
      topicId: "cost-of-living",
      userSearch: false,
    });
  });

  it("keeps commodities on the commodity source path", () => {
    expect(
      buildMarketNewsRequest(resolveMarketNewsTopic("commodities"), ""),
    ).toMatchObject({
      commodity: "commodities",
      kind: "commodity",
      title: "Commodities",
    });
  });

  it("builds ticker requests for quote and watchlist drill-downs", () => {
    const topic = resolveMarketNewsTopic("cost-of-living");

    expect(buildMarketNewsRequest(topic, "", " cba.ax ")).toMatchObject({
      kind: "ticker",
      ticker: "CBA.AX",
      title: "CBA.AX News",
    });
  });

  it("models the market scope selector shown above the ticker strip", () => {
    expect(MARKET_NEWS_MARKET_SCOPES.map((scope) => scope.label)).toEqual([
      "Australia",
      "US Markets",
      "Europe Markets",
      "Asia Markets",
      "Cryptocurrencies",
      "Rates",
      "Commodities",
      "Currencies",
    ]);

    expect(defaultMarketNewsMarketScopeId).toBe("australia");
    expect(resolveMarketNewsMarketScope(undefined).label).toBe("Australia");
    expect(resolveMarketNewsMarketScope("not-a-scope").label).toBe("Australia");
    expect(resolveMarketNewsMarketScope("commodities").tickers[0]?.symbol).toBe(
      "CL=F",
    );
  });
});
