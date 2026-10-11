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
    expect(markup).toContain("More context.");
    expect(markup).toContain("See performance and risk together.");
    expect(markup).toContain("Look beyond the headline.");
    expect(markup).toContain("Build a considered view.");
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

    expect(markup.match(/disabled=""/g)).toHaveLength(3);
    expect(markup).not.toContain('href="/Portfolio"');
    expect(markup).not.toContain('href="/MarketNews"');
    expect(markup).not.toContain('href="/Community"');
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
  });
});
