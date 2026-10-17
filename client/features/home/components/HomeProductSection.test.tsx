import { describe, expect, it, jest } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { homeRouteLinks } from "../data/homeContent";
import { HomeProductSection } from "./HomeProductSection";

describe("HomeProductSection", () => {
  it("introduces three task families with named tools and native chapter links", () => {
    const markup = renderToStaticMarkup(
      <HomeProductSection
        authLoading={false}
        signedIn={false}
        onRouteSelect={jest.fn()}
      />,
    );

    const overview = markup.match(
      /<nav[^>]*aria-label="Explore the tools"[\s\S]*?<\/nav>/,
    )?.[0];
    expect(overview).toBeDefined();
    expect(overview).toContain('href="#analyse"');
    expect(overview).toContain("Portfolio");
    expect(overview).toContain("Top Picks");
    expect(overview).toContain('href="#follow"');
    expect(overview).toContain("Watchlist");
    expect(overview).toContain("Market News");
    expect(overview).toContain('href="#experience"');
    expect(overview).toContain("Guide");
    expect(overview).toContain("Community");

    expect(markup.match(/<h2[^>]*>[\s\S]*?<\/h2>/g)).toEqual([
      expect.stringContaining("Analyse an idea"),
      expect.stringContaining("Follow your research"),
      expect.stringContaining("Learn and exchange views"),
    ]);
    for (const label of [
      "Portfolio",
      "Top Picks",
      "Watchlist",
      "Market News",
      "Guide",
      "Community",
    ]) {
      expect(markup).toMatch(new RegExp(`<h3[^>]*>${label}</h3>`));
    }
    const analyse = markup.slice(
      markup.indexOf('<section id="analyse"'),
      markup.indexOf('<section id="follow"'),
    );
    expect(analyse).toContain("<figure");
    expect(analyse).toContain("Top Picks");
    const follow = markup.slice(
      markup.indexOf('<section id="follow"'),
      markup.indexOf('<section id="experience"'),
    );
    expect(follow).toContain("Watchlist");
    expect(follow).toContain("Market News");
    expect(follow).not.toContain("<figure");
  });

  it("marks gated product entries before a signed-out user clicks", () => {
    const markup = renderToStaticMarkup(
      <HomeProductSection
        authLoading={false}
        signedIn={false}
        onRouteSelect={jest.fn()}
      />,
    );

    expect(markup).toContain(
      'aria-label="Explore portfolio, sign in required"',
    );
    expect(markup).toContain('aria-label="Read market news, sign in required"');
    expect(markup).toContain(
      'aria-label="Explore community, sign in required"',
    );
    expect(markup).not.toContain('href="/Portfolio"');
    expect(markup).toContain('aria-label="Open watchlist, sign in required"');
    expect(markup).toContain("Return is only half the story.");
    expect(markup).toContain("Your companies. Your notes.");
    expect(markup).toContain("Market news, with context.");
    expect(markup).toContain("Share a view. Hear another.");
    expect(markup).not.toContain('role="list"');
  });

  it("locks every gated product entry during the session check", () => {
    const markup = renderToStaticMarkup(
      <HomeProductSection
        authLoading
        signedIn={false}
        onRouteSelect={jest.fn()}
      />,
    );

    for (const route of homeRouteLinks) {
      expect(markup).not.toContain(`href="${route.href}"`);
    }
    const buttons = markup.match(/<button[^>]*>/g) ?? [];
    expect(buttons).toHaveLength(homeRouteLinks.length);
    expect(buttons.every((button) => button.includes('disabled=""'))).toBe(
      true,
    );
  });

  it("renders product entries as links once the user is signed in", () => {
    const markup = renderToStaticMarkup(
      <HomeProductSection
        authLoading={false}
        signedIn
        onRouteSelect={jest.fn()}
      />,
    );

    expect(markup).toContain('href="/Portfolio"');
    expect(markup).toContain('href="/MarketNews"');
    expect(markup).toContain('href="/Community"');
    expect(markup).toContain('href="/Watchlist"');
  });
});
