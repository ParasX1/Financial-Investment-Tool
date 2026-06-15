import { MARKET_NEWS_NAV_GROUPS } from "../data/marketNewsConfig";
import {
  buildMarketNewsRequest,
  defaultMarketNewsTopicId,
  getMarketNewsGroupForTopic,
  getMarketNewsTopics,
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
      MARKET_NEWS_NAV_GROUPS.find((group) => group.id === "markets")?.topics.map(
        (topic) => topic.label,
      ),
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
    });
  });
});
