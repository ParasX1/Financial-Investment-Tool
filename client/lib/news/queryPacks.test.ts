import { describe, expect, it } from "@jest/globals";
import {
  buildGdeltSearchQuery,
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
    expect(buildGoogleNewsSearchQuery(costOfLivingRequest)).toContain(
      "when:7d",
    );
    expect(getGoogleNewsLocale(costOfLivingRequest)).toEqual({
      ceid: "US:en",
      gl: "US",
      hl: "en-US",
    });
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
