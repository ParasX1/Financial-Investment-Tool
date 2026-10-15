import { describe, expect, it, jest } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { homeRouteLinks } from "../data/homeContent";
import { HomeProductSection } from "./HomeProductSection";

describe("HomeProductSection", () => {
  it("marks gated product entries before a signed-out user clicks", () => {
    const markup = renderToStaticMarkup(
      <HomeProductSection
        authLoading={false}
        routes={homeRouteLinks}
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
        routes={homeRouteLinks}
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
        routes={homeRouteLinks}
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
