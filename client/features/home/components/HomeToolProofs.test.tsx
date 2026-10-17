import { describe, expect, it, jest } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeProductSection } from "./HomeProductSection";
import {
  HomeCommunityProof,
  HomeGuideProof,
  HomeNewsProof,
  HomeTopPicksProof,
  HomeWatchlistProof,
} from "./HomeToolProofs";

describe("Home tool proofs", () => {
  it("shows the Top Picks sequence without implying a current ranking", () => {
    const markup = renderToStaticMarkup(<HomeTopPicksProof />);

    expect(markup).toMatch(
      /<ol[^>]*>[\s\S]*Choose a window[\s\S]*Sort a measure[\s\S]*Export page CSV[\s\S]*<\/ol>/,
    );
    expect(markup.match(/<li\b/g)).toHaveLength(3);
    expect(markup).not.toMatch(/\d+(?:\.\d+)?%|ranked|today|updated/i);
  });

  it("labels invented notes and questions as examples rather than user activity", () => {
    const note = renderToStaticMarkup(<HomeWatchlistProof />);
    const question = renderToStaticMarkup(<HomeCommunityProof />);

    expect(note).toContain("Example research note");
    expect(note).toContain("AAPL");
    expect(note).toContain("Next earnings: check margins.");
    expect(question).toContain("Example question");
    expect(question).toContain("historical return?");
    expect(note + question).not.toMatch(
      /saved|posted|replies|followers|<time\b|role="status"/i,
    );
  });

  it("keeps news context conditional and the guide definition bound to a period", () => {
    const news = renderToStaticMarkup(<HomeNewsProof />);
    const guide = renderToStaticMarkup(<HomeGuideProof />);

    expect(news).toMatch(/<dt>Source<\/dt>[\s\S]*<dt>Published<\/dt>/);
    expect(news).toMatch(
      /<dt>Related ticker<\/dt>[\s\S]*<dd>When available<\/dd>/,
    );
    expect(news).not.toContain("<time");
    expect(guide).toContain("Max drawdown");
    expect(guide).toContain(
      "The largest fall from a peak to a low during the selected period.",
    );
  });

  it.each([
    ["Top Picks", HomeTopPicksProof],
    ["Watchlist", HomeWatchlistProof],
    ["Market News", HomeNewsProof],
    ["Guide", HomeGuideProof],
    ["Community", HomeCommunityProof],
  ])("keeps the %s excerpt readable without adding a control", (_, Proof) => {
    const markup = renderToStaticMarkup(<Proof />);

    expect(markup).not.toBe("");
    expect(markup).not.toMatch(
      /<(?:a|button|input|select|textarea|form|h[1-6])\b|tabindex=|role="(?:button|link|textbox)"/i,
    );
  });

  it("places each excerpt before its existing route action", () => {
    const markup = renderToStaticMarkup(
      <HomeProductSection
        authLoading={false}
        signedIn
        onRouteSelect={jest.fn()}
      />,
    );
    const sections = [
      ["home-top-picks-title", "Choose a window", "/TopPicks"],
      ["home-watchlist-title", "Example research note", "/Watchlist"],
      ["home-market-news-title", "Related ticker", "/MarketNews"],
      ["home-guide-title", "Max drawdown", "/Guide"],
      ["home-community-title", "Example question", "/Community"],
    ];

    for (const [titleId, proofText, route] of sections) {
      const article = markup.match(
        new RegExp(
          `<article[^>]*aria-labelledby="${titleId}"[\\s\\S]*?<\\/article>`,
        ),
      )?.[0];
      expect(article).toBeDefined();
      expect(article).toContain(proofText);
      expect(article!.indexOf(proofText)).toBeLessThan(
        article!.indexOf(`href="${route}"`),
      );
    }
  });
});
