import { describe, expect, it } from "@jest/globals";
import { MARKET_NEWS_NAV_GROUPS } from "../data/marketNewsConfig";
import {
  MARKET_NEWS_MARKET_SCOPES,
  defaultMarketNewsMarketScopeId,
  resolveMarketNewsMarketScope,
} from "@/lib/news/tickerStrip";
import { hasNewsTopicQueryPack } from "@/lib/news/queryPacks";
import { hasNewsTopicRelevanceProfile } from "@/lib/news/relevance";
import {
  buildMarketNewsRequest,
  defaultMarketNewsTopicId,
  getMarketNewsGroupForTopic,
  getMarketNewsTopics,
  resolveMarketNewsTopic,
} from "./marketNewsNavigation";

describe("marketNewsNavigation", () => {
  it("models an investor-first channel hierarchy without overlapping catch-all topics", () => {
    expect(MARKET_NEWS_NAV_GROUPS.map((group) => group.label)).toEqual([
      "Top Stories",
      "Cost of Living",
      "Markets",
      "Money",
      "Economy & Work",
      "Technology",
    ]);

    expect(
      MARKET_NEWS_NAV_GROUPS.find(
        (group) => group.id === "markets",
      )?.topics.map((topic) => topic.label),
    ).toEqual([
      "Australian Markets",
      "Global Markets",
      "Companies & Earnings",
      "Commodities",
    ]);

    expect(
      MARKET_NEWS_NAV_GROUPS.find((group) => group.id === "money")?.topics.map(
        (topic) => topic.label,
      ),
    ).toEqual([
      "Money Overview",
      "Personal Finance",
      "Property & Housing",
      "Super & Tax",
    ]);

    expect(
      MARKET_NEWS_NAV_GROUPS.find(
        (group) => group.id === "economy-work",
      )?.topics.map((topic) => topic.label),
    ).toEqual([
      "Economy & Work Overview",
      "Economy & Policy",
      "Rates & Inflation",
      "Work & Wages",
    ]);
  });

  it("uses Top Stories as the default reader entry point", () => {
    expect(defaultMarketNewsTopicId).toBe("top-stories");
    expect(resolveMarketNewsTopic(undefined).id).toBe("top-stories");
    expect(resolveMarketNewsTopic("not-a-topic").id).toBe("top-stories");
  });

  it("flattens topics and resolves their parent groups", () => {
    const topics = getMarketNewsTopics();

    expect(topics.map((topic) => topic.id)).toContain("international-markets");
    expect(getMarketNewsGroupForTopic("commodities")?.label).toBe("Markets");
    expect(getMarketNewsGroupForTopic("property-news")?.label).toBe("Money");
    expect(getMarketNewsGroupForTopic("rates-inflation")?.label).toBe(
      "Economy & Work",
    );
  });

  it("keeps every visible topic wired to query and relevance profiles", () => {
    for (const topic of getMarketNewsTopics()) {
      expect(hasNewsTopicQueryPack(topic.id)).toBe(true);
      expect(hasNewsTopicRelevanceProfile(topic.id)).toBe(true);
    }
  });

  it("builds topic requests and lets search override the active topic source", () => {
    const topic = resolveMarketNewsTopic("australian-markets");
    const topicRequest = buildMarketNewsRequest(topic, "");

    expect(topicRequest).toMatchObject({
      kind: "regional",
      country: "au",
      title: "Australian Markets",
    });

    const searchRequest = buildMarketNewsRequest(topic, "  RBA rates  ");

    expect(searchRequest).toMatchObject({
      kind: "search",
      query: "RBA rates",
      context: "RBA rates",
      title: 'Search results for "RBA rates"',
      userSearch: true,
    });
    expect(searchRequest.topicId).toBeUndefined();
    expect(searchRequest.marketScopeId).toBeUndefined();
  });

  it("builds first-class aggregate requests for broad Money and Economy & Work views", () => {
    expect(buildMarketNewsRequest(resolveMarketNewsTopic("money"), "")).toMatchObject({
      kind: "search",
      query: expect.stringContaining("personal finance"),
      title: "Money Overview",
      topicId: "money",
      userSearch: false,
    });

    expect(
      buildMarketNewsRequest(resolveMarketNewsTopic("economy-work"), ""),
    ).toMatchObject({
      kind: "search",
      query: expect.stringContaining("jobs"),
      title: "Economy & Work Overview",
      topicId: "economy-work",
      userSearch: false,
    });
  });

  it("keeps user search independent from the active topic and market scope", () => {
    const topic = resolveMarketNewsTopic("cost-of-living");
    const currencyScope = resolveMarketNewsMarketScope("currencies");

    const request = buildMarketNewsRequest(
      topic,
      "  asx 200  ",
      "",
      currencyScope,
    );

    expect(request).toMatchObject({
      kind: "search",
      query: "asx 200",
      context: "asx 200",
      title: 'Search results for "asx 200"',
      userSearch: true,
    });
    expect(request.topicId).toBeUndefined();
    expect(request.marketScopeId).toBeUndefined();
    expect(request.title).not.toContain("Cost of Living");
    expect(request.title).not.toContain("Currencies");
    expect(request.context).not.toContain("cost of living");
    expect(request.context).not.toContain("Currencies");
  });

  it("keeps market scope out of category news requests", () => {
    const topic = resolveMarketNewsTopic("cost-of-living");
    const usScope = resolveMarketNewsMarketScope("us-markets");

    const request = buildMarketNewsRequest(topic, "", "", usScope);

    expect(request).toMatchObject({
      kind: "search",
      query: "Australia cost of living inflation wages bills interest rates",
      context: "Australian household finance cost of living",
      title: "Cost of Living",
      topicId: "cost-of-living",
      userSearch: false,
    });
    expect(request.marketScopeId).toBeUndefined();
    expect(request.query).not.toContain("US Markets");
    expect(request.query).not.toContain("S&P 500");
    expect(request.query).not.toContain("^GSPC");
    expect(request.context).not.toContain("US Markets");
    expect(request.context).not.toContain("S&P 500");
    expect(request.context).not.toContain("^GSPC");
  });

  it("does not turn the first market ticker into the default news query", () => {
    const topic = resolveMarketNewsTopic("cost-of-living");
    const australiaScope = resolveMarketNewsMarketScope("australia");

    const request = buildMarketNewsRequest(topic, "", "", australiaScope);

    expect(request).toMatchObject({
      kind: "search",
      title: "Cost of Living",
      topicId: "cost-of-living",
    });
    expect(request.marketScopeId).toBeUndefined();
    expect(request.ticker).toBeUndefined();
    expect(request.query).toContain("Australia cost of living");
    expect(request.query).not.toContain("ALL ORDS");
    expect(request.query).not.toContain("^AORD");
    expect(request.query).not.toContain("AUD/USD");
    expect(request.query).not.toContain("CL=F");
    expect(request.context).not.toContain("ALL ORDS");
    expect(request.context).not.toContain("^AORD");
  });

  it("keeps ticker drill-down independent from the active market scope", () => {
    const topic = resolveMarketNewsTopic("cost-of-living");
    const usScope = resolveMarketNewsMarketScope("us-markets");

    const request = buildMarketNewsRequest(topic, "", "cba.ax", usScope);

    expect(request).toMatchObject({
      kind: "ticker",
      ticker: "CBA.AX",
      title: "CBA.AX News",
    });
    expect(request.topicId).toBeUndefined();
    expect(request.marketScopeId).toBeUndefined();
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

    const request = buildMarketNewsRequest(topic, "", " cba.ax ");

    expect(request).toMatchObject({
      kind: "ticker",
      ticker: "CBA.AX",
      title: "CBA.AX News",
    });
    expect(request.topicId).toBeUndefined();
    expect(request.marketScopeId).toBeUndefined();
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
