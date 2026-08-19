import { describe, expect, it } from "@jest/globals";
import {
  buildGdeltSearchQuery,
  buildGoogleNewsSearchQueries,
  buildGoogleNewsSearchQuery,
  buildNewsSearchProfile,
  getGoogleNewsLocale,
} from "./queryPacks";
import type { ServerNewsRequest } from "./types";

const costOfLivingRequest: ServerNewsRequest = {
  context:
    "US Markets Major US equity benchmarks and volatility signals. S&P 500 ^GSPC Nasdaq ^IXIC Australia cost of living inflation wages bills interest rates",
  kind: "search",
  marketScopeId: "us-markets",
  pageSize: "18",
  query:
    "US Markets Australia cost of living inflation wages bills interest rates",
  topicId: "cost-of-living",
};

describe("news query packs", () => {
  it("builds concise category search text without ticker-strip noise", () => {
    const profile = buildNewsSearchProfile(costOfLivingRequest);

    expect(profile.searchText).toContain("cost of living");
    expect(profile.searchText).toContain("mortgage");
    expect(profile.searchText).toContain("United States");
    expect(profile.searchText).not.toContain("Australia");
    expect(profile.searchText).not.toContain("RBA");
    expect(profile.searchText).not.toContain("S&P 500");
    expect(profile.searchText).not.toContain("Nasdaq");
    expect(profile.searchText).not.toContain("^GSPC");
    expect(profile.searchText).not.toContain("Major US equity benchmarks");
  });

  it("builds GDELT article-list queries with source country filters", () => {
    const query = buildGdeltSearchQuery(costOfLivingRequest);

    expect(query).toContain('"cost of living"');
    expect(query).toContain("sourcecountry:US");
    expect(query).not.toContain("^GSPC");
  });

  it("builds Google News RSS queries with recency and market locale", () => {
    const query = buildGoogleNewsSearchQuery(costOfLivingRequest);

    expect(query).toContain(" OR ");
    expect(query).toContain("when:3d");
    expect(query).toContain("United States");
    expect(getGoogleNewsLocale(costOfLivingRequest)).toEqual({
      ceid: "US:en",
      gl: "US",
      hl: "en-US",
    });
  });

  it("builds multiple Google News RSS query variants for sparse categories", () => {
    const queries = buildGoogleNewsSearchQueries({
      ...costOfLivingRequest,
      marketScopeId: "europe-markets",
    });

    expect(queries.length).toBeGreaterThan(1);
    expect(queries.join(" ")).toContain("Europe");
    expect(queries.join(" ")).toContain("ECB");
    expect(queries.every((query) => query.includes("when:"))).toBe(true);
  });

  it("builds practical Money overview variants across consumer finance, property, super, and tax", () => {
    const queries = buildGoogleNewsSearchQueries({
      context: "Australian money decisions",
      kind: "search",
      pageSize: "72",
      query:
        "Australia personal finance property housing superannuation tax savings",
      topicId: "money",
    });
    const joinedQueries = queries.join(" ");

    expect(queries.length).toBeGreaterThanOrEqual(5);
    expect(joinedQueries).toContain("ATO");
    expect(joinedQueries).toContain("tax return");
    expect(joinedQueries).toContain("CGT");
    expect(joinedQueries).toContain("negative gearing");
    expect(joinedQueries).toContain("consumer finance");
    expect(joinedQueries).toContain("mortgage rates");
    expect(joinedQueries).toContain("property");
    expect(joinedQueries).toContain('-"Atmos Energy"');
    expect(joinedQueries).toContain("site:au.finance.yahoo.com/news");
    expect(queries.every((query) => query.includes("when:"))).toBe(true);
  });

  it("builds Economy & Work overview variants across policy, rates, jobs, and wages", () => {
    const queries = buildGoogleNewsSearchQueries({
      context: "Australian economy and work",
      kind: "search",
      pageSize: "72",
      query: "Australia economy policy inflation jobs wages employment",
      topicId: "economy-work",
    });
    const joinedQueries = queries.join(" ");

    expect(joinedQueries).toContain("Australian economy");
    expect(joinedQueries).toContain("RBA");
    expect(joinedQueries).toContain("jobs");
    expect(joinedQueries).toContain("wages");
    expect(joinedQueries).toContain("site:au.finance.yahoo.com/news");
    expect(queries.every((query) => query.includes("when:"))).toBe(true);
  });

  it("orders Google RSS query variants fresh-first with a broader fallback later", () => {
    const queries = buildGoogleNewsSearchQueries({
      context: "Australian household finance cost of living",
      kind: "search",
      pageSize: "18",
      query: "Australia cost of living inflation wages bills interest rates",
      topicId: "cost-of-living",
    });
    const firstBroadFallbackIndex = queries.findIndex((query) =>
      query.includes("when:30d"),
    );

    expect(queries[0]).toContain("when:3d");
    expect(firstBroadFallbackIndex).toBeGreaterThan(0);
  });

  it("adds Yahoo Finance AU indexed queries for local lifestyle finance topics", () => {
    const queries = buildGoogleNewsSearchQueries({
      context: "Australian household finance cost of living",
      kind: "search",
      pageSize: "18",
      query: "Australia cost of living inflation wages bills interest rates",
      topicId: "cost-of-living",
    });

    expect(queries.join(" ")).toContain("site:au.finance.yahoo.com/news");
    expect(queries.join(" ")).toContain("when:7d");
    expect(queries.join(" ")).toContain("rate hike");
    expect(queries.join(" ")).toContain("when:3d");
  });

  it("adds market-scope Google News variants for regional market views", () => {
    const queries = buildGoogleNewsSearchQueries({
      context: "global market news",
      kind: "search",
      marketScopeId: "us-markets",
      pageSize: "12",
      query: "global markets Wall Street stocks bonds",
      topicId: "international-markets",
    });

    expect(queries.join(" ")).toContain("US stocks");
    expect(queries.join(" ")).toContain("S&P 500");
    expect(queries.join(" ")).toContain("Wall Street");
  });

  it("expands ticker requests using known company aliases", () => {
    const profile = buildNewsSearchProfile({
      context: "company stock market news",
      kind: "ticker",
      pageSize: "5",
      ticker: "TEAM",
    });

    expect(profile.searchText).toContain("TEAM");
    expect(profile.searchText).toContain("Atlassian");
  });

  it.each([
    ["top-stories", "markets", "economy"],
    ["companies-earnings", "earnings", "ASX"],
    ["economy-policy", "Australian economy", "budget"],
    ["rates-inflation", "RBA", "inflation"],
    ["super-tax", "superannuation", "ATO"],
  ])(
    "builds focused Google query variants for the %s topic",
    (topicId, expectedPrimaryTerm, expectedSecondaryTerm) => {
      const queries = buildGoogleNewsSearchQueries({
        context: `${expectedPrimaryTerm} ${expectedSecondaryTerm}`,
        kind: "search",
        pageSize: "25",
        query: `${expectedPrimaryTerm} ${expectedSecondaryTerm}`,
        topicId,
      });
      const joinedQueries = queries.join(" ");

      expect(joinedQueries).toContain(expectedPrimaryTerm);
      expect(joinedQueries).toContain(expectedSecondaryTerm);
      expect(queries.every((query) => query.includes("when:"))).toBe(true);
    },
  );

  it("replaces relative recency with a no-gap continuation boundary", () => {
    const queries = buildGoogleNewsSearchQueries({
      ...costOfLivingRequest,
      publishedBefore: "2026-07-20T12:34:56.000Z",
      publishedBeforeKey: "story-72\u0000https://example.com/story-72",
    });

    expect(queries.length).toBeGreaterThan(1);
    expect(queries.every((query) => !query.includes("when:"))).toBe(true);
    expect(queries.every((query) => query.includes("before:2026-07-21"))).toBe(
      true,
    );
  });
});
