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
  query: "US Markets Australia cost of living inflation wages bills interest rates",
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
    expect(query).toContain("when:30d");
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
    expect(queries.every((query) => query.includes("when:30d"))).toBe(true);
  });

  it("builds practical Money News variants for Australian consumer finance coverage", () => {
    const queries = buildGoogleNewsSearchQueries({
      context: "Australian personal finance money news",
      kind: "search",
      pageSize: "18",
      query: "Australia money news banking tax superannuation savings",
      topicId: "money-news",
    });
    const joinedQueries = queries.join(" ");

    expect(queries.length).toBeGreaterThanOrEqual(5);
    expect(joinedQueries).toContain("ATO");
    expect(joinedQueries).toContain("tax return");
    expect(joinedQueries).toContain("consumer finance");
    expect(joinedQueries).toContain("mortgage rates");
    expect(queries.every((query) => query.includes("when:30d"))).toBe(true);
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
});
